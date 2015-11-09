var app = app || {};

var SearchResultItem = Backbone.Model.extend({});
  
var SearchResults = Backbone.PageableCollection.extend({
  model: SearchResultItem,

  url: "/search",

  parseRecords: function(data) {
    console.log("SERVER SEARCH RESULTS");
    console.log(data);
    return data.search_data.results
  },

  parseState: function(data) {
    return {
      pageSize: data.search_data.page_size,
      lastPage: data.search_data.last_page,
      totalPages: data.search_data.last_page,
      currentPage: data.search_data.this_page,
      criteria: data.search_data.criteria,
      facetData: data.facet_data,
      filterLabelMap: data.filter_label_map,
      totalRecords: data.search_data.total_hits
    }
  },


  forEachAppliedFilterWithLabel: function(cb) {
    var state = this.state;
    if (!_.isEmpty(state.criteria.q)) {
      cb('q', state.filterLabelMap['q']);
    }

    _.forEach(state.criteria["filter_term[]"], function(filter) {
      cb(filter, state.filterLabelMap[filter]);
    });
  },


  eachUsableFacetGroup: function(cb) {
    var state = this.state;
    _.forOwn(state.facetData, function(facets, facetGroup) {
      var usableFacets = _.filter(facets, function(facet) {
        return facet.count != state.totalRecords;
      });

      if (usableFacets.length > 0 ) {
        cb(usableFacets, facetGroup);
      }
    });
  },


  getRemoveFilterURL: function(filterToRemove) {
    var url = "/search?page=1";
    var filterKeys = _.filter(['q','filter_term[]'], function(k) {
      return k != filterToRemove;
    });

    _.forOwn(_.pick(this.state.criteria, filterKeys), function(value, key) {
      if(_.isArray(value)) {
        _.forEach(_.filter(value, function(f) { 
          return f != filterToRemove;
        }), function(filter) {
          url += "&"+key+"="+filter;
        });
      } else {
        url += "&"+key+"="+value; 
      }
    }); 

    return encodeURI(url);
  },


  getAddFilterURL: function(filterToAdd) {
    var url = "/search?page=1";
    _.forOwn(_.pick(this.state.criteria, ['q', 'filter_term[]']), function(value, key) {
      if(_.isArray(value)) {
        _.forEach(value, function(filter) {
          url += "&"+key+"="+filter;
        });
      } else {    
        url += "&"+key+"="+value;
      } 
    });
    url += "&filter_term[]="+filterToAdd;
    return encodeURI(url);
  },


  getPageURL: function(page) {
    var url = "/search?page="+page;
    _.forOwn(_.pick(this.state.criteria, ['q']), function(n, key) { 
      url += "&"+key+"="+n; 
    });
    return encodeURI(url);
  },

  getNextPageURL: function() {
    return this.getPageURL(this.state.currentPage + 1);
  },

  getPreviousPageURL: function() {
    return this.getPageURL(this.state.currentPage - 1);
  },

  getPagerStart: function() {
    return _.max([this.state.currentPage - (_.max([10 - (this.state.totalPages - this.state.currentPage), 5])), 1]);
  },

  getPagerEnd: function(){
    return _.min([_.max([(this.state.currentPage + 5), 10]), this.state.totalPages]);
  },

  queryParams: {
    firstPage: "first_page",
    currentPage: "page"
  }

});

var SearchFacetsView = Backbone.View.extend({
  el: "#sidebar",
  initialize: function() {
    var tmpl = _.template($('#facets-tmpl').html());
    this.$el.html(tmpl(this.collection));
    return this;
  },

  events: {
    "click .facet-group a": function(e) {
      e.preventDefault();
      var url = e.target.getAttribute('href');
      app.router.navigate(url, {trigger: true});
    },

    "click .applied-filters a": function(e) {
      e.preventDefault();
      var url = e.target.getAttribute('href');
      app.router.navigate(url, {trigger: true});
    }    
  }

});


var SearchItemView = Backbone.View.extend({
  tagName: "div",
  initialize: function() {
    var tmpl = _.template($('#search-result-row-tmpl').html());
    this.$el.html(tmpl(this.model.attributes));
    return this;
  }
});


var SearchResultsView = Backbone.View.extend({
  el: "#main-content",
  // tagName: "div", 
  initialize: function(opts) {
    this.render();
    return this;
  },

  events: {
    "click .pagination a": function(e) {
      e.preventDefault();      
      var url = e.target.getAttribute('href');
      app.router.navigate(url, {trigger: true});
    }
  },

  render: function() {
    console.log(this.collection);
    var $el = this.$el;
    $el.html("<h2>Search results</h2>");
    this.collection.forEach(function(item) {
      var searchItemView = new SearchItemView({
        model: item
      });

      $el.append(searchItemView.$el.html());
    });

    var pagerTmpl = _.template($('#search-pager-tmpl').html());

    console.log("SEARCH RESULT STATE");
    console.log(this.collection.state);
    $el.append(pagerTmpl(this.collection));

  }
});


// function renderResults(searchResults) {
//   // maybe easier to stick everything in searchResultsView
//   var containerView = new ContainerView({
//     mainWidth: 9,
//     sidebarWidth: 3
//   });
      
//   var searchResultsView = new SearchResultsView({
//     collection: searchResults
//   });
//   var sideBar = new SearchFacetsView({
//     collection: searchResults
//   });
  
//   $("#main-content").html(searchResultsView.$el.html());
//   $("#sidebar").html(sideBar.$el.html());

// };

// Search Form on Landing Page
var SearchBoxView = Backbone.View.extend({
  el: "#search-box",
  initialize: function() {
    var tmpl = _.template($('#search-box-tmpl').html());
    this.$el.html(tmpl());
    return this;
  },
  events: {
    "click #search-button" : "search"
  },
  search: function (e) {
    e.preventDefault();
    //TODO- get actual params from form
    var searchResults = new SearchResults([], {
      queryParams: {
        q: 'resource'
      }
    });

    searchResults.fetch().then(function() {
      // console.log(searchResults.toJSON());
      renderResults(searchResults);
    }); //TODO catch etc.
  }

});


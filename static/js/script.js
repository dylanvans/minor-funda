(() => {
	'use strict';

	// ========================================================
	// App 
	// ========================================================
	class App {
		constructor() {
			this.request = new Request(this);
			this.collection = new Collection(this);
			this.router = new Router(this);
			this.views = new Views(this);
			this.searchForm = new SearchForm(this);
			this.filters = new Filters(this);
		}

		init() {
			this.searchForm.init();
			this.router.init();
			this.filters.init();
		}
	}

	// ========================================================
	// Collection 
	// ========================================================
	class Collection {
		constructor(app) {
			this.app = app;
			this.apiKey = config.apiKey;
			this.query = '';
			this.queryPage = 1;
			this.queryPagesize = 25;
		}

		getData(searchQuery) {
			this.query = searchQuery;
			this.url = `http://funda.kyrandia.nl/feeds/Aanbod.svc/json/${this.apiKey}/?type=koop&zo=/${this.query}/&page=${this.queryPage}&pagesize=${this.queryPagesize}`;

			const callback = (data) => {
				this.app.data = data;
				this.app.views.listTemplate(this.app.data.Objects);
			};

			this.app.request.make('GET', this.url, callback)
		}
	}

	// ========================================================
	// Request 
	// ========================================================
	class Request {
		constructor(app) {
			this.app = app;
		}

		make(type, url, callback) {
			const httpRequest = new XMLHttpRequest();

			httpRequest.onload = () => {
				if (httpRequest.readyState == XMLHttpRequest.DONE) {
					if (httpRequest.status >= 200 && httpRequest.status < 400) {
						// Parse the responseText to JSON
						const data = JSON.parse(httpRequest.responseText);

						callback(data);
					} else {
						// console.error(err);
					}
				}
			}

			httpRequest.onerror = (err) => {
				console.error(err);
			}

			httpRequest.open(type, url, true); // true -> async
			httpRequest.send();
		}
	}

	// ========================================================
	// Router 
	// ========================================================
	class Router {
		constructor(app) {
			this.app = app;
		}

		init() {
			// Sets correct view when the hash changes
			routie({
			    'view-home': function() {
			    	app.views.set(this.path);
			    },
			    'view-detail/:id': function(id) {
			    	app.views.set('view-detail');
			    	app.views.detailTemplate(id);
			    }
			});
		}
	}

	// ========================================================
	// Views 
	// ========================================================
	class Views {
		constructor(app) {
			this.app = app;
			this.hideClass = 'js-hide';
			this.viewEl = document.querySelectorAll('.view');
		}

		set(activeViewId) {
			// Toggle the hideclass so the right views are hidden
			this.viewEl.forEach((el, i) => {
				el.id == activeViewId ? 
					el.classList.remove(this.hideClass) :
					el.classList.add(this.hideClass);
			})				
		}

		listTemplate(data) {
			const containerEl = document.querySelector('.container-objects');
			const template = document.getElementById('list-template').innerHTML;

			containerEl.innerHTML = ''; //Empty html, so the old elements are removed

			data.forEach((object) => {
				const el = document.createElement('section');
				el.innerHTML = template; // Fil the element with the template elements

				el.querySelector('.list-detail-link').href = `#view-detail/${object.Id}`;
		   	   	el.querySelector('.list-object-adres').innerHTML += object.Adres;
		   	   	el.querySelector('.list-object-img').src = object.FotoLarge;
		   	   	el.querySelector('.list-object-plaatsnaam').innerHTML += `${object.Postcode} ${object.Woonplaats}`;
		   	   	el.querySelector('.list-object-price').innerHTML = object['PrijsGeformatteerdHtml'];
		   	   	el.querySelector('.list-object-rooms').innerHTML = object['AantalKamers'];
			  
			    containerEl.appendChild(el);
			});
		}

		detailTemplate(id) {
			console.log(this.app.data)
			this.app.data.Objects.forEach((object) => {
				if(id == object.Id) {
					fillTemplate(object);
				}
			});

			function fillTemplate (object) {
				const containerEl = document.querySelector('.view-detail');
			    const template = document.getElementById('detail-template').innerHTML;
			    const el = document.createElement('section');
			    el.classList.add('detail-article');

				el.innerHTML = template; // Fil the element with the template elements

				el.querySelector('.detail-object-adres').innerHTML += object.Adres;
				el.querySelector('.detail-object-plaatsnaam').innerHTML = `${object.Postcode} ${object.Woonplaats}`;
				el.querySelector('.detail-object-price').innerHTML = object['PrijsGeformatteerdHtml'];
				el.querySelector('.detail-object-rooms').innerHTML = object['AantalKamers'];
				el.querySelector('.detail-img').src = object.FotoLarge;
				el.querySelector('.detail-kind').innerHTML = object['Soort-aanbod'];

				containerEl.innerHTML = ''; //Empty html, so the old element is removed
				containerEl.appendChild(el);
			}
		}

		suggestTemplate(data) {
			const containerEl = document.querySelector('.container-suggest');
			const template = document.getElementById('suggest-template').innerHTML;

			containerEl.innerHTML = ''; //Empty html, so the old elements are removed

			data.Results.forEach((object) => {
				const el = document.createElement('div');
				el.innerHTML = template; // Fil the element with the template elements

				el.querySelector('.suggest-text').innerHTML += object.Display.Naam;

				containerEl.appendChild(el);
			});
		}
	}

	// ========================================================
	// SearchForm 
	// ========================================================
	class SearchForm {
		constructor(app) {
			this.app = app;
			this.formEl = document.querySelector('.search-form');
			this.searchInputEl = this.formEl.querySelector('.search-input');
		}

		init() {
			// this.autoSuggest();

			this.formEl.addEventListener('submit', (e) => {
				e.preventDefault(); // Prevent from really submitting the form
				const query = this.searchInputEl.value.split(' ').join('-');
				this.app.collection.getData(query);
			});
		}

		autoSuggest() {
			this.searchInputEl.addEventListener('input', (e) => {
				if(this.searchInputEl.value) {
					const url = `http://zb.funda.info/frontend/geo/suggest/?query=${this.searchInputEl.value}&max=7&type=koop`;
					this.app.request.make('GET', url, this.app.views.suggestTemplate);
				} else {
					document.querySelector('.container-suggest').innerHTML = '';
				}
			});
		}
	}

	// ========================================================
	// Filters 
	// ========================================================
	class Filters {
		constructor(app) {
			this.app = app;
		}

		init() {
			this.filterListEl = document.querySelector('.filter-list');
			var filterEl = this.filterListEl.querySelectorAll('.acc-main');
			this.filterOrder = [];

			this.set();

			Sortable.create(this.filterListEl, {
				handle: '.drag-icon',
				animation: 150,
				onEnd: () => {
					for (var i = 0; i < this.filterListEl.children.length; i++) {
						this.filterOrder.push(this.filterListEl.children[i].id);
					}
					if(this.app.data) {
						this.filter();
					}
				}
			});

			filterEl.forEach((el) => {
				el.addEventListener('click', toggleAccordion);
			});

			function toggleAccordion() {
				if(this.parentNode.classList.contains('acc-inactive')) {
					this.parentNode.classList.add('acc-active');
					this.parentNode.classList.remove('acc-inactive');
				} else {
					this.parentNode.classList.remove('acc-active');
					this.parentNode.classList.add('acc-inactive');
				}
			}
		}

		set() {
			this.filterInput = this.filterListEl.querySelectorAll('.filter-input');

			this.filterInput.forEach(el => {
				el.addEventListener('change', () => {
					var name = el.name;
					if(name == 'kind') {
						this.kindFilter = el.value;
						document.querySelector('.current-kind').innerHTML = capitalizeFirstLetter(el.value);
					} else if (name == 'priceFrom') {
						this.priceFromFilter = parseInt(el.options[el.selectedIndex].value);
						document.querySelector('.current-price-from').innerHTML = this.priceFromFilter;
					} else if(name == 'priceTill') {
						this.priceTillFilter = parseInt(el.options[el.selectedIndex].value);
						document.querySelector('.current-price-till').innerHTML = this.priceTillFilter;
					} else if(name == 'room') {
						this.totalRooms = el.value;
						document.querySelector('.current-rooms').innerHTML = this.totalRooms;
					} else if(name == 'surface') {
						this.totalSurface = el.value;
						document.querySelector('.current-surface').innerHTML = this.totalSurface + '+ m2';
					}

					this.filter();
				});
			});

			function capitalizeFirstLetter(string) {
			    return string.charAt(0).toUpperCase() + string.slice(1);
			}
		}

		filter() {
			this.filteredData = this.app.data.Objects;
			this.disabledFilter = this.filterOrder[this.filterOrder.length - 1];

			if(this.kindFilter && !(this.disabledFilter == 'filter-kind')) {
				this.filteredData = this.filteredData.filter((object) => {
					if(object['Soort-aanbod'] == this.kindFilter) {
						return object;
					}
				});
			}


			if(this.priceFromFilter && !(this.disabledFilter == 'filter-price')) {
				this.filteredData = this.filteredData.filter(object => {
					if(object['Prijs']['Koopprijs'] > this.priceFromFilter) {
						return object;
					}
				});
			}

			if(this.priceTillFilter && !(this.disabledFilter == 'filter-price')) {
				this.filteredData = this.filteredData.filter(object => {
					if(object['Prijs']['Koopprijs'] < this.priceTillFilter) {
						return object;
					}
				});
			}

			if(this.totalRooms && !(this.disabledFilter == 'filter-rooms')) {
				this.filteredData = this.filteredData.filter(object => {
					if(object['AantalKamers'] > this.totalRooms) {
						return object;
					}
				});
			}

			if(this.totalSurface && !(this.disabledFilter == 'filter-surface')) {
				this.filteredData = this.filteredData.filter(object => {
					if(object['Woonoppervlakte'] > this.totalSurface) {
						return object;
					}
				});
			}

			this.app.views.listTemplate(this.filteredData)
			console.log(this.filteredData)
		}
	}

	const app = new App();
	app.init();

})();
	var agility_webrtc = {

		uuid : null,

		currentUser : null,
		
		last_time_votes_updated : Date.now(),
		
		isPresenter : false,

		slide_moods 	: [
			{ name : "Horrible" , count : 0, value : 0 },
			{ name : "Bad"		, count : 0, value : 1 }, 
			{ name : "Good"		, count : 0, value : 2 }, 
			{ name : "Great"	, count : 0, value : 3 },
			{ name : "Awesome"	, count : 0, value : 4 }
		],

		slide_pics 	: [
			{ pic_url : "images/presentation/01.png" },
			{ pic_url : "images/presentation/02.png" },
			{ pic_url : "images/presentation/03.png" }
		],

		current_slide : 0,

		channelMessages : [],

		presentationVotes : [],
		
		channelName : "agility_webrtc",
		
		credentials : {
			publish_key 	: 'your pub key',
			subscribe_key 	: 'your sub key'
		},

		init : function(){

			var self = agility_webrtc;
			
			isPresenter = (document.URL.indexOf("presenter") > 0);
			
			agility_webrtc.currentUser = PUBNUB.init(agility_webrtc.credentials);	
			
			agility_webrtc.currentUser.subscribe({
				channel 	: agility_webrtc.channelName,
				callback 	: agility_webrtc.onChannelListMessage
			});
			
			self.setBinds();
			
			self.loadTemplates({
				templates_url : "javascripts/resources/templates.html"
			}, function(){			

				self.showPresentationScreen();

			})


		},

		applyStyles 	: function(){

  
			var parHeight = $(window).height(); /*Get Screen Height*/
			var parWidth = $(window).width(); /*Get Screen Width*/			

			if(parWidth > 769){
				$('.commentsWindowWrap .commentsList').css('height',parHeight-288); //Update Card Holder Height
				$('.sliderWrap .slider').css('height',parHeight-364); /*Update Card Holder Height*/
				$('.sliderWrap .sliderEspectador').css('height',parHeight-320); /*Update Card Holder Height*/
			};

			if(parWidth < 768){
				$('.commentsWindowWrap .commentsList').css('height','auto'); /*Update Card Holder Height*/
				$('.sliderWrap .slider').css('height','auto'); /*Update Card Holder Height*/
				$('.sliderWrap .sliderEspectador').css('height','auto'); /*Update Card Holder Height*/
			};

		},
		

		showPresentationScreen : function(){

			agility_webrtc.render({
				container 	: "#content",
				template 	: "#presentation_template",
				data 		: {
					user 		: agility_webrtc.currentUser,
					slide_moods : agility_webrtc.slide_moods,
					slides  : agility_webrtc.slide_pics
				}
			})	

		},


		render 				: function(options){

			var content = _.template($(options.template).html(), options.data );

			$(options.container).html(content);	

		},

		render_prepend		: function(options){

			var content = _.template($(options.template).html(), options.data );

			$(options.container).prepend(content);	

		},
		
		loadTemplates : function(options, callback){

			$("#templatesContainer").empty().remove();

			$('<div id="templatesContainer"></div>').appendTo('body');
			
			$('#templatesContainer').load(("javascripts/resources/templates.html?r=" + Date.now()), function(){

				if(typeof callback === "function"){
					callback();
				}

			})

		},

		setInStore 	: function(item, key){

			if(item == null){
				return false;
			}

			item = _.isString(item) ? item : JSON.stringify(item);
			
			window.localStorage.setItem(key, item);

		},
		getFromStore : function(key){
			
			return JSON.parse(window.localStorage.getItem(key));

		},
		
		changeSlide 		: function(options){
			
			if(options == null){
				options = {slide: 1}
			}

			$(".slider").carousel(options.slide);

			active_index = $(".carousel-inner .active").index();

			switch(options.slide){
				case "prev":
					active_index--;
				break;
				case "next":
					if(($(".slideCount li").length - 1) == active_index){
						active_index = 1
					} else {
				 		active_index++;
					}
				break;
				default:
					if(typeof options.slide === 'number')
					{
						active_index = options.slide;
					}	
				break;
			}	

			$(".slideCount li").removeClass("active");
			$($('.slideCount li')[active_index]).addClass("active");

			agility_webrtc.current_slide = active_index;
		},
		
		displayAnalyticsGraphic : function(data){

			if(agility_webrtc.presentationVotes.length > 30){
				agility_webrtc.presentationVotes = _.last(agility_webrtc.presentationVotes,2);
			}

			draw({
				data 		: agility_webrtc.presentationVotes,
				container 	: "#linesWarp",
				width 		: $("#linesWarp").width(),
				height 		: $("#linesWarp").height(),
				moods 		: agility_webrtc.slide_moods
			});

			$("text, .guideWarp").hide();

			if($(".data-point").length > 0){
				setTimeout(function(){

					$(".tipsy").hide();
					$(".data-point:last").trigger("mouseover")
					$(".area").addClass($(".data-point:last").attr("class").split(" ")[1]);
					
				}, 1000);
			}

			agility_webrtc.last_time_votes_updated = Date.now();

		},

		displayBarsGraphic 	: function(filtered_moods){

			$('.bargraph div.graphLabel[data-mood-name] div.bar').css({width:0});

			_.each(filtered_moods, function(mood){
				$('.bargraph div.graphLabel[data-mood-name="' + mood.name + '"] div.bar').animate({width: ((mood.percentage -1) + "%")}, 800, "swingFromTo")
				$('.bargraph div.graphLabel[data-mood-name="' + mood.name + '"] span.mood_count').html(mood.percentage + "%");
			})


		},

		filter_moods : function(){

			var filtered_moods = [];

			var mood_count, filtered_mood;

			_.each(agility_webrtc.slide_moods, function(mood){

				mood_count = _.countBy(agility_webrtc.presentationVotes, function(vote){ return vote.mood_name === mood.name; }).true || 0;

				filtered_mood = {
					name 		: mood.name,
					count 		: mood_count,
					percentage 	: (mood_count * 100 / agility_webrtc.presentationVotes.length).toFixed(2)
				}

				filtered_moods.push(filtered_mood);

			})

			return filtered_moods;

		},

		processVotes 	: function(vote){

			var mood = _.find(agility_webrtc.slide_moods, function(mood){ return mood.name === vote.mood_name; });

			vote.date = vote.created_on ? new Date(vote.created_on) : new Date();

			console.log("Vote " + mood.value + " cast at " + vote.date);

			vote.value = mood.value;

			agility_webrtc.presentationVotes.push(vote);

			filtered_moods = agility_webrtc.filter_moods();

			agility_webrtc.displayBarsGraphic(filtered_moods);

			if((Date.now() - agility_webrtc.last_time_votes_updated) > 500){
				agility_webrtc.displayAnalyticsGraphic();
			}


		},
		
		onChannelListMessage : function(message){

			var self = agility_webrtc;

			switch(message.type){				
				case "VOTE":
					agility_webrtc.processVotes(message);
				break;
				case "SLIDE":
					agility_webrtc.changeSlide(message.options);
				break;
			}

		},
		
		setBinds : function(){

			$(document).on("click", ".control", function(e){
			
				e.preventDefault();
				e.stopPropagation();

				var total_slides = $(".slideCount li").length;

				var is_next = $(this).is(".nextSlide");

				var slide_to = $(".slideCount li.active").data("slide-to");

				if(slide_to != null){
					slide_to = (is_next ? (slide_to + 1) : (slide_to - 1));
				} else {
					slide_to = 0;
				}
				
				slide_to = slide_to < 0 ? (total_slides) : (slide_to === total_slides ? 0 : slide_to);

				slide_to = slide_to === total_slides ? total_slides - 1 : slide_to;

				slide_to = slide_to < 0 ? 0 : slide_to;
				
				$(".slideCount li").removeClass("active");
				$('.slideCount li[data-slide-to="' + slide_to  + '"]').addClass("active");

				$(".slider").carousel(slide_to);
				
				agility_webrtc.currentUser.publish({
					channel: agility_webrtc.channelName,
						message: {
						type: "SLIDE",
						options: { slide: slide_to }
					}
			    });
				
			}),
			
			$(document).on("click",".slideCount li:not(.active)", function(e){
				
				e.preventDefault();
				e.stopPropagation();

				if( isPresenter ){

					var el = $(e.target);
					var slide_to = Number($(el).data("slide-to"));
					
					$(".slideCount li").removeClass("active");
					$('.slideCount li[data-slide-to="' + slide_to + '"]').addClass("active");

					agility_webrtc.currentUser.publish({
						channel: agility_webrtc.channelName,
							message: {
							type: "SLIDE",
							options: {slide: slide_to}
						}
					});
	
				}




			}),
			
			$(document).on("click", ".rateOption", function(e){

				var slide_mood = $(this).data("slide-mood");

				if($(this).is(".disabled")){
					return false;
				}

				$(".rateOption").addClass("disabled");

				var mood = _.find(agility_webrtc.slide_moods, function(mood){
					return mood.name === slide_mood;
				})

				$(this).animate({ opacity : 0.5 }, 400, function(){
					$(this).animate({ opacity : 1 }, 400);
					$(".rateOption").removeClass("disabled");
				})

				$(".title").animate({left : "-100%"}, 800);
				$(".thanks_for_rating").animate({left : "0"}, 800);
				
				_.delay(function(){

					$(".title").animate({left : "0"}, 800);
					$(".thanks_for_rating").animate({left : "-100%"}, 800);


				}, 2000);

				agility_webrtc.currentUser.publish({
					channel: agility_webrtc.channelName,
					message : {
						type 		: "VOTE",
						mood_name 	: slide_mood
					}
				});


			});
			
			return this;
		
		}

	}
    
	agility_webrtc.init();


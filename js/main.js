(function () {
	//var APPTAG = 'gchallenge';
	var APPTAG = 'ru--blokcheijn';
	var config = null, node = null;
	var templates = {};

	function loadJson(file, done, fail) {
		$.ajax({
			url: '_config/' + file + '.json',
			dataType: 'json'
		}).done(function(data){
			if(done != null) done(data);
		}).fail(function(err) {
			$.ajax({
				url: 'https://raw.githubusercontent.com/tbolt-hackathon/gchallenge.io/master/_config/' + file + '.json',
				dataType: 'json'
			}).done(function(data){
				if(done != null) done(data);
			}).fail(function(err) {
				if(fail != null) fail(err);
			});
		});
	}

	function loadConfig(callback){
		loadJson('config', function(c){
			config = c;
			if(config != null && config.golos.node != null)
			{
				loadJson('nodes/' + config.golos.node, function(n){
					node = n;
					if(node != null)
					{
						golos.config.set('websocket', node.address);
						golos.config.set('chain_id', node.chainid);
						$('body > header > nav > a.golos-io').attr('href', node.webclient);

						if(callback != null) callback();
					}
				});
			}
		});
	}

	function loadTemplates(callback){
		$.ajax({
			url: 'views/article.htm',
			dataType: 'text'
		}).done(function(tpl){
			templates.article = tpl;
			if(callback && templates.article && templates.article_video) callback();
		});
		$.ajax({
			url: 'views/article_video.htm',
			dataType: 'text'
		}).done(function(tpl){
			templates.article_video = tpl;
			if(callback && templates.article && templates.article_video) callback();
		});
	}
	
	function post() {
		
	}

	function loadPosts(){
		if(!templates || !templates.article) loadTemplates(loadPosts);

		golos.api.getDiscussionsByTrending({select_tags: [APPTAG], limit: 100}, function(err, result){
			if(!err && result)
			{
				for(var k in result)
				{
					var post = result[k];

					var view = $(templates.article);
					view.find('.title').text(post.title);
					view.find('.author').text(post.author);
					view.find('.body').html(post.body);

					$('div.posts').append(view);
				}
			}
		});
	}

	$(function(){
		loadConfig(function(){
			loadPosts();
		});

		$('a.action-signin').on('click', function(){
			$('section.signin, button.signin-signin').toggleClass('hidden');
		});

		$('button.action-post').on('click', function(){
			$('div.new-challenge-overlay').toggleClass('hidden');
		});
	});

})();
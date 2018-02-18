(function () {
	var APPTAG = 'gchallenge';
	var config = null, node = null;
	var templates = {};

	var auth = {
		loggedIn: false,
		login: function(){
			return localStorage.getItem('auth.login');
		},
		auth: function(login, pass){
			localStorage.setItem('auth.login', login);
			localStorage.setItem('auth.keys.owner', pass);
			auth.loggedIn = true;
		},
		keys: {
			owner: function(){
				return localStorage.getItem('auth.keys.owner');
			},
			posting: function(){
				return auth.keys._getKey('posting');
			},
			active: function(){
				return auth.keys._getKey('active');
			},
			memo: function(){
				return auth.keys._getKey('memo');
			},
			_getKey: function(role){
				if(!auth.loggedIn) return null;
				var key = localStorage.getItem('auth.keys.' + role);
				if(!key)
				{
					var wif = auth.keys.owner();
					if(!wif) return;
					var keys = golos.auth.getPrivateKeys(auth.login(), wif);
					for(var k in keys)
					{
						if(!keys.hasOwnProperty(k)) continue;
						localStorage.setItem('auth.keys.' + k, keys[k]);
						key = localStorage.getItem('auth.keys.' + role);
					}
				}
				return key;
			}
		}
	};

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
	
	function post(title, body)
	{
		if(!auth.loggedIn)
		{
			alert('Sign in with golos please');
			return;
		}

		var meta = {};

		golos.broadcast.comment(auth.keys.posting(), '', APPTAG, auth.login(), 'gchallenges-' + Date.now(), title, body, JSON.stringify(meta), function(err, result){
			console.log(err, result);
		});
	}

	function loadPosts(){
		if(!templates || !templates.article) loadTemplates(loadPosts);

		golos.api.getDiscussionsByTrending({select_tags: [APPTAG], limit: 100}, function(err, result){
			if(!err && result)
			{
				for(var k in result)
				{
					if(!result.hasOwnProperty(k)) continue;

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

		$('button.action-post').on('contextmenu', function(){
			post('Test', 'Hello, world!');
		});

		$('button.signin-signin').on('click', function(){
			var login = $('input.signin-login').val().trim();
			var pass = $('input.signin-password').val().trim();

			if(login.length < 1 || pass.length < 1) return;

			auth.auth(login, pass);
			console.log(auth.keys.posting());
			$('section.signin, button.signin-signin').addClass('hidden');
			$('a.action-signin').off('click').text('@' + auth.login());
		});
		$('.addContentJson').on('click', function(){
			
		});
		$("input.signin-login, input.signin-password").keyup(function(e){
			if (e.keyCode === 13) {
				$("button.signin-signin").click();
			}
		});
	});
})();
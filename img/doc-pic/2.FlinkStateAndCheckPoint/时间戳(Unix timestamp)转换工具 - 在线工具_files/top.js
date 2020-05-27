(function () {
	function receiveMessage(e) {
		var iframe = document.getElementById('comment_frame');
		if (iframe.src.indexOf(e.origin) === 0) {
			var data = JSON.parse(e.data);
			switch (data.event) {
				case 'size':
					iframe.style.height = data.height + 'px';
					break;
			}
		}
	}
	if (window.addEventListener) {
		window.addEventListener('message', receiveMessage, false);
	} else {
		window.attachEvent('onmessage', receiveMessage);
	}
})();

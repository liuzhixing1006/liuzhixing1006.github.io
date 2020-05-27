(function () {
	/**
	 * 只能统计 _blank 的点击事件
	 */
	$(document).on('click', '.js-track', function (e) {
		var target = $(this).attr('href');
		var url = document.URL;
		var params = {target: target, url: url};
		var args = "";
		for (var i in params) {
			if (args != "") {
				args += "&";
			}
			args += i + "=" + encodeURIComponent(params[i]);
		}
		var img = new Image(1, 1);
		img.src = '//analytics.tool.lu/__ev.gif?' + args;

		var rndId = '_img_' + Math.random();
		window[rndId] = img;
		img.onload = img.onerror = function () {
			window[rndId] = null;
		};
	});
})();

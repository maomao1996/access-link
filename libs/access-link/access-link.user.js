/*!
// ==UserScript==
// @name         跳转链接修复
// @namespace    https://github.com/maomao1996/tampermonkey-scripts
// @version      0.3.7
// @description  为知乎、微信拦截页面增加跳转按钮（支持3秒后自动跳转）
// @author       maomao1996
// @include      *://weixin110.qq.com/cgi-bin/mmspamsupport-bin/*
// @include      *://link.zhihu.com/*
// @grant        GM_notification
// @require		   https://cdn.jsdelivr.net/npm/jquery@v3.4.1
// ==/UserScript==
*/
;
(function () {
    'use strict';
    function getQueryStringArgs(url) {
        if (url && url.indexOf('?') > -1) {
            var arr = url.split('?');
            var qs = arr[1];
            var args = {};
            var items = qs.length ? qs.split('&') : [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i].split('=');
                var key = decodeURIComponent(item[0]);
                var value = decodeURIComponent(item[1]);
                if (key.length) {
                    args[key] = value;
                }
            }
            return args;
        }
        return {};
    }
    var params = getQueryStringArgs(location.search);
    var target = '';
    var url = '';
    var insertion = 'after';
    function initParams(u, t, cls) {
        if (cls === void 0) { cls = 'button'; }
        url = u;
        target = t;
        return ('<a href="' + u + '" class="' + cls + '">继续访问 (3 秒后自动跳转)</a>');
    }
    var fns = {
        'weixin110.qq.com': function () {
            return initParams($('.weui-msg div.weui-msg__desc').text(), '.weui-msg', 'weui-btn_cell weui-btn_cell-primary');
        },
        'link.zhihu.com': function () {
            insertion = 'html';
            return initParams(params.target, '.actions');
        }
    };
    var fn = fns[location.hostname];
    var html = typeof fn === 'function' ? fn() : '';
    var isUrl = /^(https|http):\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9]+[\/=\?%\-&_~`@[\]\':+!]*([^<>\"\"])*$/.test(url);
    if (target && html && isUrl) {
        $(target)[insertion](html);
        setTimeout(function () {
            location.href = url;
        }, 3000);
    }
    else {
        GM_notification({ timeout: 2e3, text: '获取 url 失败！' });
    }
})();

// Renders the post list from blog/posts.js into any element with data-blog-list
// (data-format="table" renders table rows).
// data-limit="3" shows only the newest posts; data-base is the path to the blog folder.
(function () {
  'use strict';
  var posts = (window.BLOG_POSTS || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function formatDate(iso) {
    var p = iso.split('-');
    return months[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  }

  var lists = document.querySelectorAll('[data-blog-list]');
  Array.prototype.forEach.call(lists, function (list) {
    var limit = parseInt(list.getAttribute('data-limit') || '0', 10);
    var base = list.getAttribute('data-base') || '';
    var items = limit ? posts.slice(0, limit) : posts;
    if (!items.length) {
      list.innerHTML = list.getAttribute('data-format') === 'table'
        ? '<tr><td colspan="3">The first post is on its way.</td></tr>'
        : '<li class="post-item"><p class="post-item__summary">The first post is on its way.</p></li>';
      return;
    }
    if (list.getAttribute('data-format') === 'table') {
      list.innerHTML = items.map(function (p) {
        return '<tr>' +
          '<td class="post-table__date"><time datetime="' + esc(p.date) + '">' + formatDate(p.date) + '</time></td>' +
          '<td><a class="post-table__title" href="' + esc(base + p.url) + '">' + esc(p.title) + '</a>' +
          '<p class="post-table__summary">' + esc(p.summary) + '</p></td>' +
          '<td class="post-table__len">' + esc(p.readingTime || '') + '</td>' +
          '</tr>';
      }).join('');
      return;
    }
    list.innerHTML = items.map(function (p) {
      return '<li class="post-item">' +
        '<p class="post-item__meta"><time datetime="' + esc(p.date) + '">' + formatDate(p.date) + '</time><span>' + esc(p.readingTime || '') + '</span></p>' +
        '<h3 class="post-item__title"><a href="' + esc(base + p.url) + '">' + esc(p.title) + '</a></h3>' +
        '<p class="post-item__summary">' + esc(p.summary) + '</p>' +
        '</li>';
    }).join('');
  });
})();

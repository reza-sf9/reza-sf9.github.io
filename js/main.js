// On narrow screens the career timeline scrolls sideways; start it at the most recent years.
(function () {
  var scroller = document.querySelector('.path__scroll');
  if (scroller && scroller.scrollWidth > scroller.clientWidth) {
    scroller.scrollLeft = scroller.scrollWidth;
  }
})();

// The retro news window on the homepage always shows the newest blog post.
(function () {
  var posts = (window.BLOG_POSTS || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  var title = document.getElementById('news-title');
  var link = document.getElementById('news-link');
  var date = document.getElementById('news-date');
  if (!posts.length || !title || !link || !date) return;
  var p = posts[0];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var d = p.date.split('-');
  title.textContent = p.title;
  link.href = 'blog/' + p.url;
  date.textContent = months[parseInt(d[1], 10) - 1] + ' ' + parseInt(d[2], 10) + ', ' + d[0];
})();

// Side navigation: highlight the section currently on screen.
(function () {
  var list = document.querySelector('.sidenav__list');
  if (!list || !('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(list.querySelectorAll('a[href^="#"]'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  var current = null;

  function setActive(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      if (on) {
        a.setAttribute('aria-current', 'true');
        // on phones the links sit in a horizontal bar; keep the active one in view
        if (list.scrollWidth > list.clientWidth) {
          var left = a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2;
          list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
        }
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  var visible = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    for (var i = 0; i < sections.length; i++) {
      if (visible[sections[i].id]) { setActive(sections[i].id); return; }
    }
  }, { rootMargin: '-35% 0px -60% 0px' });
  sections.forEach(function (s) { io.observe(s); });

  // the last section is short, so mark it when the page bottom is reached
  window.addEventListener('scroll', function () {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      setActive(sections[sections.length - 1].id);
    }
  }, { passive: true });
})();

// Local time in Shrewsbury, MA, so visitors in other time zones can plan a call.
(function () {
  'use strict';
  var clock = document.getElementById('clock');
  var tz = document.getElementById('tz');
  if (!clock || !window.Intl) return;

  var zone = 'America/New_York';
  var timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' });
  var zoneFmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' });

  function render() {
    var now = new Date();
    clock.textContent = timeFmt.format(now).replace('AM', 'am').replace('PM', 'pm');
    if (tz) {
      var part = zoneFmt.formatToParts(now).filter(function (p) { return p.type === 'timeZoneName'; })[0];
      tz.textContent = part ? part.value : 'Eastern time';
    }
  }

  render();
  var now = new Date();
  setTimeout(function () {
    render();
    setInterval(render, 60000);
  }, (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50);
})();

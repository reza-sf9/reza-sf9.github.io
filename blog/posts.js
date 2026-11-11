/*
 * The list of blog posts. To publish a new post:
 *   1. Copy blog/posts/_template.html to blog/posts/your-post-name.html and write it.
 *   2. Add an entry for it at the top of this list.
 * blog/index.html lists them all in a table, newest first.
 */
window.BLOG_POSTS = [
  {
    title: 'Right answer, wrong reasons: why reasoning quality matters in medical LLMs',
    url: 'posts/reasoning-quality-medical-llms.html',
    date: '2026-11-11',
    readingTime: '5 min read',
    summary: 'Medical LLMs are judged by their final answers, but clinicians act on the reasoning. What recent papers show about the gap, and how to measure and train for better reasoning.'
  },
  {
    title: 'Jev vs LLMs: when you need a decision, not a paragraph',
    url: 'posts/jev-vs-llms.html',
    date: '2026-10-26',
    readingTime: '6 min read',
    summary: "TypeSafe's Jev returns typed decisions with calibrated confidence instead of text. What that changes, where it could fit in clinical AI, and what I'd test before trusting it."
  }
];

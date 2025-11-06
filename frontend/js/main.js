// js/main.js
// This file is for any JavaScript you want to run on your landing page (index.html).
// For example, smooth scrolling for the nav links.
document.querySelectorAll('.navbar nav a').forEach(anchor => {
  if (anchor.hash) { // Only target links with a '#'
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.hash).scrollIntoView({
        behavior: 'smooth'
      });
    });
  }
});
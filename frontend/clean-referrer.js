/* Removes optional ChatGPT referral labels from the browser address bar.
   It does not redirect and preserves unrelated query parameters and fragments.
   The real website URL never needs a ChatGPT referral value. */
(() => {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const name of ['utm_source', 'source', 'ref', 'referrer']) {
      const value = url.searchParams.get(name);
      if (value && /chatgpt(?:\.com)?/i.test(value)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + url.search + url.hash
      );
    }
  } catch (_) {
    // An unsupported browser must still be able to load the site.
  }
})();

# Frontend Performance — PageSpeed Insights

Performance analysis was conducted using [Google PageSpeed Insights](https://pagespeed.web.dev/). The report provides detailed metrics on page load times, responsiveness, and overall desktop performance for the deployed application.

**Tested URL:** `<deployed app URL>`

## Desktop vs. Mobile Performance Metrics

PageSpeed Insights runs the same audit twice under different conditions, which is why the two scores differ:

| | Desktop | Mobile |
|---|---|---|
| **CPU Throttling** | No throttling; simulates high-performance desktop hardware | Simulated throttling to emulate mid-range mobile devices |
| **Network Conditions** | Simulated fast 4G or Wi-Fi connection | Simulated slow 3G or 4G connection to mimic real-world mobile conditions |
| **Rendering Speed** | Faster rendering due to higher processing power | Slower rendering due to limited CPU and GPU capabilities |
| **User Interaction** | Prioritizes critical resources for fast rendering | Prioritizes above-the-fold content to improve perceived load times |

## What the metrics mean

- **First Contentful Paint (FCP)** — how quickly the first piece of content (text or image) appears on screen.
- **Largest Contentful Paint (LCP)** — how quickly the main visible content finishes loading; Google targets under 2.5 seconds.
- **Total Blocking Time (TBT)** — how long the page is unresponsive to user input while JavaScript loads and runs; heavy bundles increase this.
- **Cumulative Layout Shift (CLS)** — how much the page layout jumps around while loading; a stable layout scores close to 0.
- **Speed Index** — how quickly the contents of the page become visibly filled in.

## Improvements applied / possible

- Production build served via Vite (`npm run build`), producing minified, tree-shaken bundles with hashed filenames for long-term caching.
- React is loaded as a single production bundle; code could be split further with lazy-loaded routes if TBT on mobile is high.
- Possible follow-ups: compress large images (WebP/AVIF), preload the main font, and lazy-load below-the-fold dashboard widgets.

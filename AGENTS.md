<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

The static HTML app keeps barcode capture and product lookup on `public/scan.html` with `public/js/scan.js`, while `public/nutrition.html` only shows daily targets; this keeps the centered Scan navigation destination distinct from Nutrition.

The Scan page uses a locally packaged ZXing browser reader for continuous camera decoding rather than a remote detector import; this avoids browser API and third-party script availability differences across phones and laptops.

The landing and login pages share a small logo welcome animation in `public/js/intro.js`; this keeps the opening treatment consistent while leaving authenticated pages unchanged.

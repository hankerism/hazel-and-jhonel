import Script from "next/script";

const CLARITY_PROJECT_ID = "xn3webqc09";

/**
 * Loads the Microsoft Clarity analytics tag site-wide.
 *
 * Rendered once from the root layout. The tag is only injected in production
 * builds so local development and previews stay out of the Clarity dashboard.
 * Uses `next/script` with the `afterInteractive` strategy so the snippet runs
 * after hydration without blocking first-party code.
 */
export function MicrosoftClarity() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;
    t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}

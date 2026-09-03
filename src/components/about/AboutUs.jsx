import Image from 'next/image';
import Script from 'next/script';
import { RENTAL_BENEFITS, RENTAL_FAQS, RENTAL_STEPS } from '@/components/about/aboutContent';
const SIGNUP_URL = 'https://signup.legallyng.com/';
const BANNER_IMAGE = '/images/rental-banner-img.png';
const CONTENT_IMAGE = '/images/rental-content-img.jpg';
const DOTLOTTIE_PLAYER =
  'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-wc@0.9.28/dist/dotlottie-wc.js';

export default function AboutUs() {
  return (
    <>
      <Script src={DOTLOTTIE_PLAYER} type="module" strategy="lazyOnload" />

      <section className="legally-page-banner">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="sec-head">
                {/* `h1`, where the handover has an `h4`: it is the page's only
                    top-level heading, and the size is the stylesheet's business. */}
                <h1 className="sec-title">Digitalize Your Rental Business For Utmost Profit</h1>
              </div>
              <div className="cms-con">
                <p>
                  All-in-one platform to rent out your assets as it pleases you and earn maximum
                  profit.
                </p>
              </div>
              <div className="btn-wrapper">
                <a
                  className="btn btn-primary d-inline-block"
                  href={SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started
                </a>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="legally-banner-img">
                <Image
                  src={BANNER_IMAGE}
                  alt="Legally Rental running on a phone and a laptop"
                  width={916}
                  height={610}
                  priority
                  sizes="(max-width: 991px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="market-place-sec common-sec">
        <div className="container">
          <div className="row gx-xl-4 align-items-center flex-row-reverse">
            <div className="col-md-6 col-12">
              <div className="market-place-img">
                <Image
                  src={CONTENT_IMAGE}
                  alt="Managing a rental listing in the Legally app"
                  width={637}
                  height={562}
                  sizes="(max-width: 767px) 100vw, 50vw"
                />
              </div>
            </div>
            <div className="col-md-6 col-12">
              <div className="market-place-text">
                <div className="cms-con mb-0">
                  <p>
                    Legally App Rental feature is designed to help start or enhance your rental
                    business. Legally rental makes it easy to have full control of your rental
                    business from anywhere. Legally rental allows you to transition your hotel,
                    property, car or machinery rental business from the cumbersome traditional
                    approach to a digitalized one. Our rental feature allows you to automate
                    booking, payment, availability, pricing, check-in, check-out, drop off and
                    pickup.
                  </p>
                  <p>
                    Say goodbye to the stress of getting your rent from tenants as a landlord. Say
                    goodbye to the down times your property rental business suffers as a result of
                    quiet notice periods. Our rental feature makes it easy for you to convert your
                    property to a BnB where rental is upfront and stay is only for the time booked.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="legally-benifits-sec common-sec">
        <div className="container">
          {/* `.benifits-wrap` is what the design CSS hangs the section heading's
              size and centring off — the wrapper is a style hook, not scaffolding. */}
          <div className="benifits-wrap">
            <div className="sec-head">
              <h2 className="sec-title">Benefits of Legally Rental</h2>
            </div>
          </div>
          {/* `list-unstyled` because the design CSS was written for `<div>` rows and
              so resets nothing: a bare `<ul>` here shows bullets and Bootstrap's
              2rem indent. The list is still a list — eleven sibling benefits. */}
          <ul className="benifit-row list-unstyled">
            {RENTAL_BENEFITS.map((benefit) => (
              <li className="benifit-col" key={benefit.icon}>
                <div className="benifit-box">
                  <div className="benifit-icon">
                    {/* A custom element, inert until the player module upgrades it.
                        The label beside it carries the meaning, so it is hidden
                        from assistive tech rather than given a name of its own. */}
                    <dotlottie-wc
                      src={`/lottie/${benefit.icon}.lottie`}
                      autoplay="true"
                      loop="true"
                      speed="1"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="benifit-desc">
                    <h3 className="benifit-name">{benefit.label}</h3>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="protect-sec common-sec">
        <div className="container">
          <div className="row gx-3 gx-md-4">
            <div className="col-md-6">
              {/* Sticky rather than the theme's `theiaStickySidebar` script: the
                  heading tracks the steps beside it with no JavaScript at all. */}
              <div className="sec-head protect-sec-head">
                <h2 className="sec-title">How Rental Works?</h2>
              </div>
            </div>
            <div className="col-md-6">
              {/* Same reason as the benefits list: unstyled, or the browser's own
                  "1." markers land on top of the design's own numbering. */}
              <ol className="protect-benefit-main list-unstyled">
                {RENTAL_STEPS.map((step) => (
                  <li className="protect-benefit-text" key={step.title}>
                    <h3 className="protect-benefit-title">{step.title}</h3>
                    {step.description ? (
                      <div className="cms-con">
                        <p>{step.description}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
      <section className="faq-sec common-sec">
        <div className="container">
          <div className="sec-head">
            <h2 className="sec-title text-center">Frequently asked Questions</h2>
          </div>
          <div className="accordion" id="rentalFaqAccordion">
            {RENTAL_FAQS.map((faq, index) => {
              // The design opens the first answer; `data-bs-parent` then closes
              // whichever is open as another is expanded.
              const isFirst = index === 0;
              const headingId = `rentalFaqHeading${index}`;
              const panelId = `rentalFaqPanel${index}`;

              return (
                <div className="accordion-item" key={faq.question}>
                  <h3 className="accordion-header" id={headingId}>
                    <button
                      className={isFirst ? 'accordion-button' : 'accordion-button collapsed'}
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#${panelId}`}
                      aria-expanded={isFirst}
                      aria-controls={panelId}
                    >
                      {faq.question}
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    className={
                      isFirst ? 'accordion-collapse collapse show' : 'accordion-collapse collapse'
                    }
                    aria-labelledby={headingId}
                    data-bs-parent="#rentalFaqAccordion"
                  >
                    <div className="accordion-body">
                      <div className="cms-con">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

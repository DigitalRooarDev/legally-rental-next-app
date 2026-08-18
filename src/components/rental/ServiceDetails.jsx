import Image from 'next/image';
import ServiceActions from '@/components/rental/ServiceActions';
import ServiceBookingCard from '@/components/rental/ServiceBookingCard';
import ServiceGallery from '@/components/rental/ServiceGallery';
import ServicePolicyCard from '@/components/rental/ServicePolicyCard';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { formatPeriod, formatPrice, formatRating, stripHtml } from '@/utils/formats';

/**
 * Details page body.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').ServiceDetailViewModel} props.service
 */
export default function ServiceDetails({ service }) {
  const rating = formatRating(service.rating);
  const sellerRating = formatRating(service.seller?.rating);

  // The API stores descriptions as HTML; render as text rather than trusting it.
  const description = stripHtml(service.description).trim();

  const period = service.periodType ? formatPeriod(service.periodType) : '';

  const priceCards = [
    { key: 'base', label: 'Base Price', icon: 'icon-payment-n', amount: service.basePrice, period },
    {
      key: 'weekend',
      label: 'Weekend Price',
      icon: 'icon-payment-n',
      amount: service.weekendPrice,
      period,
    },
    {
      key: 'deposit',
      label: 'Refundable Security Deposit',
      icon: 'icon-refund-2',
      amount: service.cautionAmount,
      period: '',
    },
  ]
    .map((card) => ({ ...card, money: formatPrice(card.amount) }))
    .filter((card) => Number.parseFloat(card.money.base) > 0);

  return (
    <section className="service-details-sec">
      <div className="container">
        <div className="service-details-head">
          <h1 className="service-details-title">{service.name}</h1>

          <ServiceActions
            serviceId={service.id}
            name={service.name}
            isFavorite={service.isFavorite}
          />

          {/* {service.categoryName ? (
              <span className="service-details-badge">{service.categoryName}</span>
            ) : null} */}
        </div>
        <ServiceGallery images={service.images} name={service.name} />

        <div className="row service-details-row">
          <div className="col-lg-7">
            {service.location || service.highlights?.length || rating ? (
              <div className="service-block">
                {service.location ? (
                  <h2 className="service-block-title"> {service.location}</h2>
                ) : null}
                {service.highlights?.length ? (
                  <ul className="product-card-specs">
                    {service.highlights.map((spec) => (
                      <li key={spec.label}>
                        {spec.icon ? (
                          <i className={`icon ${spec.icon}`} aria-hidden="true" />
                        ) : null}
                        {spec.label}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {rating ? (
                  <span className="service-details-rating">
                    <i className="icon icon-star" aria-hidden="true" /> {rating}
                    {service.ratingCount > 0 ? <> · {service.ratingCount} Reviews </> : null}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="service-block">
              <>
                {priceCards.length > 0 ? (
                  <div>
                    <h2 className="service-block-title">Price Breakup</h2>
                    <ul className="price-breakup">
                      {priceCards.map((card) => (
                        <li className="price-card" key={card.key}>
                          <span className="price-card-icon">
                            <i className={`icon ${card.icon}`} aria-hidden="true" />
                          </span>
                          <span className="price-card-body">
                            <span className="price-card-label">{card.label}</span>
                            <span className="price-card-amount">
                              {CURRENCY_SYMBOL}
                              {card.money.formatted}
                              {card.period ? <small>{card.period}</small> : null}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {service.seller ? (
                  <div className="service-seller">
                    {service.seller.image ? (
                      <Image
                        className="service-seller-avatar"
                        src={service.seller.image}
                        alt=""
                        width={48}
                        height={48}
                      />
                    ) : null}
                    <div>
                      <div className="service-seller-name">
                        Stay with {service.seller.name || 'Legally host'}
                      </div>
                      <div className="service-seller-rating">
                        {sellerRating ? (
                          <>
                            <i className="icon icon-star" aria-hidden="true" /> {sellerRating}
                            {service.seller.ratingCount > 0 ? (
                              <span> ({service.seller.ratingCount})</span>
                            ) : null}
                          </>
                        ) : (
                          <span>New host</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            </div>

            {description ? (
              <div className="service-block">
                <h2 className="service-block-title">Description</h2>
                <div className="cms-con">
                  <p>{description}</p>
                </div>
              </div>
            ) : null}

            {service.attributes.length > 0 ? (
              <div className="service-block">
                <h2 className="service-block-title">Details</h2>
                <dl className="service-attributes">
                  {service.attributes.map((attribute) => (
                    <div className="service-attribute" key={attribute.key}>
                      <span className="service-attr-icon">
                        <i className={`icon ${attribute.icon}`} aria-hidden="true" />
                      </span>
                      <div>
                        <dt>{attribute.label}</dt>
                        <dd>{attribute.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {service.features.length > 0 ? (
              <div className="service-block">
                <h2 className="service-block-title">What this place offers</h2>
                <ul className="service-features">
                  {service.features.map((feature, index) => (
                    <li key={`${feature.id || feature.name}-${index}`}>
                      {feature.imageURL ? (
                        <Image src={feature.imageURL} alt="" width={24} height={24} />
                      ) : null}
                      {feature.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {service.faqs.length > 0 ? (
              <div className="service-block">
                <h2 className="service-block-title">FAQs</h2>
                <dl className="service-faqs">
                  {service.faqs.map((faq, index) => (
                    <div key={index}>
                      <dt>{faq.question}</dt>
                      <dd>{stripHtml(faq.answer)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <div className="col-lg-5">
            <div className="service-booking-column">
              <ServiceBookingCard service={service} />
              <ServicePolicyCard service={service} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

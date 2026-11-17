import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Gift,
  HandHeart,
  Users,
  MapPin,
  Clock3,
  CheckCircle2,
  Sparkles,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import Navbar from "../components/navbar";
import "../styles/home.css";

const features = [
  {
    icon: Heart,
    title: "Give your time",
    description:
      "Find volunteering that fits your passion, skills, and schedule.",
    action: "Explore volunteering",
    href: "/opportunities",
  },
  {
    icon: Gift,
    title: "Give things a new life",
    description: "Pass on something you don't need. Make someone's day.",
    action: "Explore free items",
    href: "/items",
  },
  {
    icon: HandHeart,
    title: "Be there for someone",
    description:
      "Ask for a hand or lend yours. Small favors build strong bonds.",
    action: "Find community help",
    href: "/help-requests",
  },
  {
    icon: Users,
    title: "Find your people",
    description: "Join organizations turning shared values into real action.",
    action: "Meet organizations",
    href: "/organizations",
  },
];

const opportunities = [
  {
    id: 1,
    title: "Plant a greener neighborhood",
    organization: "Green Roots Collective",
    category: "Environment",
    location: "Bengaluru, Karnataka",
    date: "Sat, 21 Nov · 9:00 AM",
    type: "Volunteering",
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&auto=format&fit=crop&q=85",
  },
  {
    id: 2,
    title: "Good food. Better together.",
    organization: "The Community Kitchen",
    category: "Food & Hunger",
    location: "Bengaluru, Karnataka",
    date: "Flexible schedule",
    type: "Volunteering",
    image:
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=900&auto=format&fit=crop&q=85",
  },
  {
    id: 3,
    title: "Help a young mind bloom",
    organization: "Bright Futures Foundation",
    category: "Education",
    location: "Bengaluru, Karnataka",
    date: "Weekends",
    type: "Volunteering",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&auto=format&fit=crop&q=85",
  },
];

const categories = [
  "All opportunities",
  "Environment",
  "Food & Hunger",
  "Education",
  "Community",
];

function FeatureCard({ feature }) {
  const Icon = feature.icon;

  return (
    <a href={feature.href} className="feature-card">
      <span className="feature-icon">
        <Icon size={21} strokeWidth={1.9} />
      </span>

      <h3>{feature.title}</h3>
      <p>{feature.description}</p>

      <span className="feature-link">
        {feature.action}
        <ArrowRight size={16} />
      </span>
    </a>
  );
}

function OpportunityCard({ opportunity }) {
  return (
    <article className="opportunity-card">
      <div className="opportunity-image">
        <img src={opportunity.image} alt={opportunity.title} />

        <span className="opportunity-tag">{opportunity.category}</span>

        <button
          className="save-button"
          aria-label={`Save ${opportunity.title}`}
          onClick={(event) => {
            event.currentTarget.classList.toggle("saved");
          }}
        >
          <Heart size={18} />
        </button>
      </div>

      <div className="opportunity-body">
        <span className="opportunity-type">{opportunity.type}</span>

        <h3>{opportunity.title}</h3>
        <p className="opportunity-org">{opportunity.organization}</p>

        <div className="opportunity-meta">
          <span>
            <MapPin size={15} />
            {opportunity.location}
          </span>

          <span>
            <Clock3 size={15} />
            {opportunity.date}
          </span>
        </div>

        <a
          className="opportunity-footer"
          href={`/opportunities/${opportunity.id}`}
        >
          <span>View opportunity</span>
          <ArrowUpRight size={17} />
        </a>
      </div>
    </article>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All opportunities");

  const filteredOpportunities =
    activeCategory === "All opportunities"
      ? opportunities
      : opportunities.filter((item) => item.category === activeCategory);

  return (
    <>
      <Navbar />

      <main>
        {/* HERO */}
        <section className="hero-section">
          <div className="page-container">
            <div className="hero-grid">
              <div className="hero-content">
                <div className="eyebrow hero-eyebrow">
                  <span className="eyebrow-dot" />
                  LITTLE MOMENTS. BIG IMPACT.
                </div>

                <h1>
                  Small actions,
                  <br />
                  real impact<span className="green-period">.</span>
                </h1>

                <h2>A better world starts right where you are.</h2>

                <p className="hero-description">
                  Give your time. Share what you have. Lend a hand. Connect with
                  your community and turn everyday kindness into something that
                  matters.
                </p>

                <div className="hero-buttons">
                  <a href="/explore" className="btn btn-primary">
                    Find your good deed
                    <ArrowUpRight size={17} />
                  </a>

                  <a href="/register" className="btn btn-light">
                    I need a little help
                    <ArrowRight size={17} />
                  </a>
                </div>

                <div className="hero-highlights">
                  <span>
                    <CheckCircle2 size={15} /> Free to join
                  </span>
                  <span>
                    <CheckCircle2 size={15} /> Open to everyone
                  </span>
                  <span>
                    <CheckCircle2 size={15} /> Real local impact
                  </span>
                </div>
              </div>

              <div className="hero-visual">
                <img
                  className="hero-image"
                  src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&auto=format&fit=crop&q=90"
                  alt="Community garden with plants and greenery"
                />

                <div className="hero-floating-top">
                  <span className="floating-dot" />
                  GOOD THINGS HAPPEN HERE
                </div>
              </div>
            </div>

            <div className="hero-bottom">
              <span>YOUR COMMUNITY. A LITTLE MORE CONNECTED.</span>
              <span>Local people. Shared purpose. Endless possibilities.</span>
            </div>
          </div>
        </section>

        {/* WAYS TO HELP */}
        <section className="ways-section" id="how-it-works">
          <div className="page-container">
            <div className="section-heading">
              <span className="eyebrow">
                FIND YOUR WAY TO MAKE A DIFFERENCE
              </span>
              <h2>There's more than one way to do good.</h2>
            </div>

            <div className="features-grid">
              {features.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </div>
          </div>
        </section>

        {/* OPPORTUNITIES */}
        <section className="opportunities-section">
          <div className="page-container">
            <div className="opportunities-heading">
              <div className="section-heading">
                <span className="eyebrow">YOUR NEXT GOOD DEED</span>
                <h2>A little time. A lasting difference.</h2>
                <p>
                  Find a cause you care about, and a community to share it with.
                </p>
              </div>

              <a href="/opportunities" className="view-all-link">
                View all opportunities
                <ArrowRight size={17} />
              </a>
            </div>

            <div className="category-filters">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-pill ${
                    activeCategory === category ? "active" : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category === "All opportunities" && <Sparkles size={14} />}
                  {category}
                </button>
              ))}
            </div>

            {filteredOpportunities.length > 0 ? (
              <div className="opportunities-grid">
                {filteredOpportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-opportunities">
                <Leaf size={28} />
                <h3>No opportunities in this category yet</h3>
                <p>Try another category to discover more ways to help.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="page-container">
            <div className="cta-content">
              <span className="eyebrow">GOOD STARTS WITH YOU</span>
              <h2>Your next good deed starts here.</h2>
              <p>
                Whether you want to give a little or need a helping hand,
                there's a place for you at GoodDeed.
              </p>
              <a href="/register" className="btn btn-white">
                Join the community
                <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="page-container footer-inner">
          <div>
            <strong className="footer-brand">GoodDeed</strong>
            <p>Small actions, real impact.</p>
          </div>

          <div className="footer-links">
            <a href="/explore">Discover</a>
            <a href="/organizations">Organizations</a>
            <a href="/about">About</a>
          </div>

          <span className="footer-copyright">
            © {new Date().getFullYear()} GoodDeed
          </span>
        </div>
      </footer>
    </>
  );
}

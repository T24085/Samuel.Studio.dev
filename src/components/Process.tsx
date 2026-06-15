import { ArrowRight, FileText, MousePointerClick, Rocket, Shapes, Sparkles, Wand2 } from 'lucide-react';

const steps = [
  {
    title: 'Discovery Form',
    description: 'Share your goals, brand, and audience so we can define the right direction.',
    icon: FileText,
  },
  {
    title: 'Style Direction',
    description: 'We choose a visual direction that fits your brand and audience.',
    icon: Sparkles,
  },
  {
    title: 'Design & Build',
    description: 'We design, develop, and refine the site with performance in mind.',
    icon: Wand2,
  },
  {
    title: 'Review & Refine',
    description: 'We tune the details before launch so everything feels finished.',
    icon: Shapes,
  },
  {
    title: 'Launch',
    description: 'We test, deploy, and hand off a site ready to work from day one.',
    icon: Rocket,
  },
  {
    title: 'Support',
    description: 'Ongoing updates, edits, content changes, and support after launch.',
    icon: MousePointerClick,
  },
];

export function Process() {
  return (
    <section className="section" id="process">
      <div className="container">
        <div className="section-heading" data-reveal>
          <p className="section-label">Our process</p>
          <h2>A Clean Process. A Strong Finish.</h2>
          <p>From brief to launch, shaped around clarity, taste, and conversion.</p>
        </div>

        <div className="process">
          <div className="process__rail" aria-hidden="true" />
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article className="process-step" key={step.title} data-reveal>
                <div className="process-step__icon">
                  <Icon size={18} />
                </div>
                <div className="process-step__index">0{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {index < steps.length - 1 ? <ArrowRight className="process-step__arrow" size={16} /> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

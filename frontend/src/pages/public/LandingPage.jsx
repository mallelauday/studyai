import { Link } from 'react-router-dom';
import { Brain, Sparkles, Clock, Target, ArrowRight, BarChart3, Layers, FileText, UploadCloud, Cpu, PlayCircle, TrendingUp, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function LandingPage() {
  return (
    <div className="flex flex-col w-full min-h-screen pt-24 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-500/20 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] mix-blend-screen" />
      </div>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full py-16 md:py-24 lg:py-32">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium text-sm mb-8 shadow-sm">
            <Sparkles size={16} className="text-primary-500" /> Introducing StudyAI 2.0
          </motion.div>
          
          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 dark:text-white leading-[1.1]">
            Learn faster with <br className="hidden md:block" />
            <span className="gradient-text">Intelligent Study Tools</span>
          </motion.h1>
          
          <motion.p variants={fadeIn} className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your materials and instantly get AI-generated summaries, adaptive flashcards, and personalized quizzes.
          </motion.p>
          
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-lg hover:scale-105 transition-transform shadow-xl">
              Start Studying Free <ArrowRight size={20} />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white/50 dark:bg-dark-card/50 backdrop-blur-sm border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white font-medium text-lg hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
              See How It Works
            </a>
          </motion.div>
        </motion.div>

        {/* Hero Abstract Graphic */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          <div className="aspect-[16/9] rounded-2xl overflow-hidden glass shadow-2xl border border-white/40 dark:border-white/10 relative p-2 bg-white/40 dark:bg-dark-card/40">
             <div className="w-full h-full rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200/50 dark:border-dark-border/50 flex flex-col shadow-inner">
                <div className="h-12 border-b border-gray-200 dark:border-dark-border flex items-center px-4 gap-2 bg-white/50 dark:bg-dark-card/50">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 p-8 flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="relative w-32 h-32 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 border-4 border-dashed border-primary-500/30 rounded-full"></div>
                    <Brain size={48} className="text-primary-500" />
                  </motion.div>
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative z-10 bg-white/30 dark:bg-dark-bg/30 border-y border-gray-200/50 dark:border-dark-border/50 pt-28 -mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white tracking-tight">Your complete study ecosystem</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">Everything you need to master your courses, seamlessly integrated into one powerful AI platform.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: FileText, title: 'AI Summary Generation', desc: 'Instantly condense 50-page PDFs into actionable, bite-sized revision notes.', color: 'text-primary-500', bg: 'bg-primary-500/10 border-primary-500/20' },
              { icon: Layers, title: 'Smart Flashcards', desc: 'Automatically generated flashcards with spaced repetition algorithms built-in.', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
              { icon: Target, title: 'Adaptive Quizzes', desc: 'Test your knowledge with quizzes that adapt to your performance level.', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
              { icon: Clock, title: 'Personalized Study Planner', desc: 'Let AI schedule your study sessions based on your exam dates and difficulty.', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
              { icon: BarChart3, title: 'Learning Analytics', desc: 'Visualize your progress, track your velocity, and predict your exam scores.', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
              { icon: Brain, title: 'Weak Topic Detection', desc: 'Our AI pinpoints exactly where you struggle and focuses your revision there.', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="glass-card p-8 h-full flex flex-col bg-white/60 dark:bg-dark-card/60"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 border`}>
                  <feature.icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 relative z-10 pt-28 -mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white tracking-tight">How it works</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">Turn your raw notes into a personalized learning path in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: UploadCloud, title: '1. Upload Study Material', desc: 'Simply drag & drop your PDFs, Word docs, or paste your lecture notes directly.', color: 'text-blue-500' },
              { icon: Cpu, title: '2. Generate AI Content', desc: 'Our AI processes your files to build summaries, flashcards, and study guides instantly.', color: 'text-primary-500' },
              { icon: PlayCircle, title: '3. Practice with Quizzes', desc: 'Take automatically generated practice tests to challenge your understanding.', color: 'text-orange-500' },
              { icon: TrendingUp, title: '4. Track Progress & Improve', desc: 'View your analytics dashboard to focus on your weak points and boost retention.', color: 'text-green-500' },
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Connecting Line */}
                {idx < 3 && <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gray-200 dark:bg-dark-border -z-10 group-hover:bg-primary-300 dark:group-hover:bg-primary-700 transition-colors"></div>}
                
                <div className="w-20 h-20 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform z-10">
                  <step.icon size={32} className={step.color} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative z-10 bg-white/30 dark:bg-dark-bg/30 border-y border-gray-200/50 dark:border-dark-border/50 pt-28 -mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white tracking-tight">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">Choose the plan that fits your study needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-8 flex flex-col bg-white/60 dark:bg-dark-card/60"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Free Plan</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Perfect for getting started.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-500 dark:text-gray-400 font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {['Up to 3 document uploads/mo', 'Basic AI Summaries', '50 Flashcards per month', 'Community Support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Check size={20} className="text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="w-full py-4 text-center rounded-xl border-2 border-gray-200 dark:border-dark-border font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                Get Started Free
              </Link>
            </motion.div>

            {/* Student Pro Plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 flex flex-col bg-primary-900 text-white relative transform md:-translate-y-4 shadow-2xl border-primary-700"
            >
              <div className="absolute top-0 right-0 bg-primary-500 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Student Pro</h3>
              <p className="text-primary-200 mb-6">For serious learners needing more.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold">$9</span>
                <span className="text-primary-300 font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {['Unlimited document uploads', 'Advanced AI Summaries', 'Unlimited Flashcards & Quizzes', 'Personalized Study Planner', 'Learning Analytics'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <Check size={20} className="text-primary-300 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="w-full py-4 text-center rounded-xl bg-primary-500 hover:bg-primary-400 font-bold text-white transition-colors shadow-lg">
                Start Pro Trial
              </Link>
            </motion.div>

            {/* Premium AI Plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-8 flex flex-col bg-white/60 dark:bg-dark-card/60"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Premium AI</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Ultimate power for researchers.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$19</span>
                <span className="text-gray-500 dark:text-gray-400 font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {['Everything in Pro', 'Priority AI Processing', 'Weak Topic Detection', 'Export to PDF/Notion', '24/7 Priority Support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Check size={20} className="text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="w-full py-4 text-center rounded-xl border-2 border-gray-200 dark:border-dark-border font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                Go Premium
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 relative z-10 pt-28 -mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden bg-gray-900 dark:bg-dark-card border border-gray-800 dark:border-dark-border shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-transparent to-blue-600/30"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">Ready to ace your next exam?</h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">Join thousands of students who are saving time and improving their grades with StudyAI.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register" className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white text-gray-900 font-medium text-lg hover:scale-105 transition-transform shadow-lg">
                  Create Free Account <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white font-medium text-lg hover:bg-white/20 transition-colors">
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

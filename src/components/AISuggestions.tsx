import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AISuggestionsProps {
  suggestions: string[];
}

export const AISuggestions: React.FC<AISuggestionsProps> = ({ suggestions }) => {
  return (
    <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-indigo-500/20">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-widest">AI Insights</h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 group"
          >
            <ArrowRight className="w-3 h-3 mt-1 text-indigo-500 group-hover:translate-x-1 transition-transform" />
            <p className="text-sm text-slate-300 leading-relaxed">
              {suggestion}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

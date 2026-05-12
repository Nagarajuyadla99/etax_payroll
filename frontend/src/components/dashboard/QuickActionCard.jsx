import { motion } from "framer-motion";

export default function QuickActionCard({ cls, icon, label, onClick }) {
  return (
    <motion.button
      type="button"
      className={`qa-btn ${cls}`}
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.16 }}
    >
      <div className="qa-icon">{icon}</div>
      <span>{label}</span>
    </motion.button>
  );
}

import Logo from "../assests/PennyPilot.png";
import { Link as RouterLink } from "react-router-dom";
import AmbientTechBg from "../components/AmbientTechBG";
import { motion, useScroll, useTransform } from "framer-motion";

const MotionVStack = motion.div;
const MotionHeading = motion.h1;
const MotionText = motion.p;
const MotionImage = motion.img;
const MotionButton = motion.button;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.12 * i, ease: "easeOut" },
  }),
};

const HomePage = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  return (
    <div className="relative min-h-screen overflow-hidden pt-24 md:pt-28">
      <AmbientTechBg hue={28} intensity={0.16} />

      <div className="relative z-10 mx-auto max-w-2xl px-6 md:px-8">
        <MotionVStack
          className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center gap-8 text-center"
          initial="hidden"
          animate="visible"
        >
          <div className="rounded-3xl border border-teal bg-brand-900 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <MotionImage
              src={Logo}
              alt="PennyPilot Logo"
              className="max-h-[180px] rounded-2xl"
              draggable={false}
              style={{ opacity }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-peach px-3 py-1 text-xs font-semibold text-brand-900">
              New
            </span>
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-brand-900">
              Smart Budgeting
            </span>
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-brand-900">
              Investment Tracker
            </span>
          </div>

          <MotionHeading
            className="text-4xl font-extrabold text-mist md:text-5xl"
            variants={fadeUp}
            custom={1}
          >
            Take Control of Your Finances
          </MotionHeading>

          <MotionText
            className="max-w-2xl text-base text-mist/80 md:text-lg"
            variants={fadeUp}
            custom={2}
          >
            Track income, expenses, and investments in one place. Set goals,
            stay on budget, and make smarter money decisions with clear,
            delightful insights.
          </MotionText>

          <MotionButton
            className="rounded-xl bg-teal px-8 py-3 font-bold text-mist shadow-[0_12px_30px_rgba(17,100,102,0.35)]"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            variants={fadeUp}
            custom={3}
            onClick={() => (window.location.href = "/dashboard")}
          >
            Get Started
          </MotionButton>

          <MotionText className="text-sm text-mist/70" variants={fadeUp} custom={4}>
            Already have an account?{" "}
            <RouterLink to="/login" className="font-semibold text-peach">
              Log in
            </RouterLink>
          </MotionText>
        </MotionVStack>
      </div>
    </div>
  );
};

export default HomePage;


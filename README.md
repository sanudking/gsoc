# 🌌 High-Fidelity 3D Physics Laboratory

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://physics-sanu.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Powered%20By-Three.js%20%2B%20React-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://threejs.org/)

A premium, interactive 3D physics sandbox built for GSoc 2026. This application transforms abstract physical concepts into a high-fidelity, interactive playground where users can visualize, manipulate, and calculate textbook physics in real-time.

**🌐 Live Demo:** [https://physics-sanu.vercel.app](https://physics-sanu.vercel.app)

---

## 🎬 Visual Demonstrations

<video src="assets/pendulum.mov" width="100%" controls autoplay loop muted></video>
> *Watch part 1 of the high-fidelity interaction demo.*

### Advanced Physics Scenarios
<video src="assets/ramp.mov" width="100%" controls autoplay loop muted></video>
> *Watch part 2 showcasing torque, elastic collisions, and ramp kinematics.*

*(Note: Videos are located in the `/assets` folder of this repository)*

---

## 🧪 Interactive Laboratories

The sandbox features four distinct, mathematically accurate laboratories:

### 1. 🕒 Pendulum Lab (Simple Harmonic Motion)
Explore the relationship between string length, gravity, and timing.
- **Interactive:** Drag the bob to a precise starting angle and release.
- **Theory:** Live calculation of the Ideal Period: $T = 2\pi\sqrt{L/g}$.
- **Dynamics:** Real-time visual rope calculation connecting the anchor to the bob.

### 2. 📐 Inclined Plane (Kinematics)
Test the laws of motion on a frictionless or high-friction ramp.
- **Interactive:** Pivot the ramp and release projectiles from the absolute summit.
- **Theory:** Live Vertical Height ($h = L \sin \theta$) and Final Velocity ($v = \sqrt{2gh}$) readouts.
- **Precision:** Trigonometrically aligned spawning ensures the ball strikes the ramp surface flawlessly.

### 3. ⚖️ Torque Balance (Static Equilibrium)
A heavy-duty, ultra-stable lever for demonstrating moments and balance.
- **Interactive:** Drop precise weights at fixed distances ($r=4.5$) from the fulcrum.
- **Stability:** High angular damping and mass ratios ensure a smooth, realistic dip rather than a bouncy simulation.
- **Theory:** Real-time Torque readout: $\tau = r \times F$.

### 4. 🎾 Elastic Collisions (Bouncing Lab)
Visualize restitution and energy loss in a controlled environment.
- **Interactive:** Set a custom initial Drop Height and watch the balls collide.
- **Customization:** Adjust the coefficient of restitution ($e$) from perfectly inelastic to super-elastic.
- **Theory:** First Rebound Height calculation: $h_1 = h \cdot e^2$.

---

## 🛠️ Technical Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **3D Engine:** [Three.js](https://threejs.org/) via [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber)
- **Physics Engine:** [Cannon.js](https://github.com/schteppe/cannon.js) via [`@react-three/cannon`](https://github.com/pmndrs/use-cannon)
- **UI Components:** [Lucide-React](https://lucide.dev/) + Glassmorphic CSS Logic
- **Helpers:** [`@react-three/drei`](https://github.com/pmndrs/drei) (Environment, Shadows, Controls)

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+)
- npm / yarn

### Installation
1. Clone the repository:
   ```bash
   git clone [your-github-url]
   cd physicsSanu
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 💎 Design Philosophy
The project was designed to be "100x better" than standard educational apps. It utilizes:
- **Studio Environment Lighting:** Soft shadows and reflections for a premium feel.
- **Zero-Drop Spawning:** Avoiding physics engine artifacts by intelligently placing objects.
- **Glassmorphism:** A modern, translucent UI that floats over the 3D scene without obstructing it.

---
*Developed as a high-fidelity interactive physics demonstration for GSoc 2026.*

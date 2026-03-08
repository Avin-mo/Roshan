import { Link } from "react-router-dom";
import './Navbar.css';
export default function Navbar() {
  return (
    <div className="navbar">
      <div className="logo">Roshan</div>

      <div className="navLinks">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </div>
    </div>
  );
}
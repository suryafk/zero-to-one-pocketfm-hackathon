import { SearchIcon, CoinIcon, UserIcon } from './Icons.jsx'

export default function Header({ searchTerm, onSearchChange, onAbout }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-dot" aria-hidden="true" />
        <div className="brand-text">
          <span className="brand-primary">ReVibe</span>
        </div>
      </div>

      <label className="search-bar">
        <SearchIcon className="search-icon" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search stories, genres, regions..."
          aria-label="Search stories, genres, regions"
        />
      </label>

      <div className="header-meta">
        <button className="header-nav-link" type="button" onClick={onAbout}>About Us</button>
        <span className="coin-pill">
          <CoinIcon /> 120 Coins
        </span>
        <span className="user-pill">
          <UserIcon /> User
        </span>
      </div>
    </header>
  )
}

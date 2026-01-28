import './Footer.css';

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <p>
                    Creado por <a href="https://github.com/avalontm" target="_blank" rel="noopener noreferrer">AvalonTM</a>
                </p>
                <p className="footer-date">&copy; {currentYear} Hytale Server Panel</p>
            </div>
        </footer>
    );
}

export default Footer;

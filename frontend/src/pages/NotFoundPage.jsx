import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import './NotFoundPage.css';

function NotFoundPage() {
    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <div className="error-text-container">
                    <h1 className="error-title">ERROR 404</h1>
                    <div className="error-divider"></div>
                    <p className="error-message">
                        Whoops! It seems that we're not able to find what you are looking for.
                        Please try again later or <Link to="/" className="home-link">return to the homepage</Link>.
                    </p>
                </div>
                <div className="error-image-container">
                    <img src="/static/images/kweebec.png" alt="Kweebec" className="kweebec-image" />
                </div>
            </div>

            <div className="not-found-footer-wrapper">
                <Footer />
            </div>
        </div>
    );
}

export default NotFoundPage;

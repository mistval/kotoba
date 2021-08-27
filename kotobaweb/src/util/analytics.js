import ReactGA from 'react-ga';
import { googleAnalyticsTrackingID } from '../config.json';

const analytics = {
  setPageView(view) {
    if (googleAnalyticsTrackingID) {
      ReactGA.pageview(view);
    }
  },
  init() {
    if (googleAnalyticsTrackingID) {
      ReactGA.initialize(googleAnalyticsTrackingID);
      this.setPageView('/home');
    }
  },
  event(category, action, label) {
    if (googleAnalyticsTrackingID) {
      ReactGA.event({
        category,
        action,
        label,
      });
    }
  },
};

export default analytics;

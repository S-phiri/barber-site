interface AnalyticsEvent {
  event: string;
  payload?: Record<string, any>;
}

class Analytics {
  private events: AnalyticsEvent[] = [];

  track(event: string, payload?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      payload,
      ...(payload && { payload }),
    };

    this.events.push(analyticsEvent);

    // In a real implementation, you would send this to your analytics service
    console.log("Analytics Event:", analyticsEvent);
  }

  getEvents() {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }
}

const analytics = new Analytics();

export function track(event: string, payload?: Record<string, any>) {
  analytics.track(event, payload);
}

export default analytics;

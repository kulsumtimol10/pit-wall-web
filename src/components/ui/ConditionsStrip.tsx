import type { WeatherReading } from '../../lib/data-types';
import { compass } from '../../lib/weather';

/** Broadcast-style weather line shown over the 3D view. */
export function ConditionsStrip({ reading, title }: { reading: WeatherReading | null; title: string }) {
  if (!reading) return null;
  return (
    <div className="conditions-strip" aria-label={title}>
      <span className="cond-title">{title}</span>
      <span className={`cond-state ${reading.rainfall ? 'wet' : 'dry'}`}>{reading.rainfall ? 'Wet' : 'Dry'}</span>
      <span>
        Track <strong>{reading.trackTemp.toFixed(1)} °C</strong>
      </span>
      <span>
        Air <strong>{reading.airTemp.toFixed(1)} °C</strong>
      </span>
      <span>
        Humidity <strong>{reading.humidity}%</strong>
      </span>
      <span>
        Wind{' '}
        <strong>
          {compass(reading.windDirection)} {reading.windSpeed.toFixed(1)} m/s
        </strong>
      </span>
    </div>
  );
}

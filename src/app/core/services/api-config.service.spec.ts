import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiConfigService } from './api-config.service';

describe('ApiConfigService', () => {
  it('reads the backend url from the environment', () => {
    const config = TestBed.inject(ApiConfigService);

    expect(config.baseUrl).toBe(environment.apiBaseUrl);
    expect(config.endpoint('/api/auth/me')).toBe(`${environment.apiBaseUrl}/api/auth/me`);
  });
});

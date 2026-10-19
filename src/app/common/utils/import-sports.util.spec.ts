import { describe, expect, it } from 'vitest';
import { parseSportsImport } from './import-sports.util';

describe('parseSportsImport', () => {
  it('reads a json array of sports', () => {
    const drafts = parseSportsImport(
      'sports.json',
      JSON.stringify([
        { name: 'Football', description: 'A game', iconUrl: 'https://example.com/football.svg' },
        { name: 'Tennis' },
      ]),
    );

    expect(drafts).toEqual([
      { name: 'Football', description: 'A game', iconUrl: 'https://example.com/football.svg' },
      { name: 'Tennis' },
    ]);
  });

  it('reads a csv with a header row', () => {
    const drafts = parseSportsImport(
      'sports.csv',
      'name,description,iconUrl\nFootball,"A, game",https://example.com/a.svg\n',
    );

    expect(drafts).toEqual([
      { name: 'Football', description: 'A, game', iconUrl: 'https://example.com/a.svg' },
    ]);
  });
});

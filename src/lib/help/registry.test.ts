import { describe, it, expect } from 'vitest';
import {
  FEATURE_AREAS,
  HELP_ARTICLES,
  HELP_CATEGORIES,
  HELP_SLUGS,
  getArticlesByCategory,
} from './registry';
import { hasHelpDoc } from './content';
import { TOUR_IDS } from '@/tours/tours';

describe('help registry coverage', () => {
  it('documents every feature area with at least one article', () => {
    for (const area of FEATURE_AREAS) {
      const covered = HELP_ARTICLES.some((a) => a.featureArea === area);
      expect(covered, `feature area "${area}" has no help article`).toBe(true);
    }
  });

  it('maps every guided tour to a help article', () => {
    for (const tourId of TOUR_IDS) {
      const covered = HELP_ARTICLES.some((a) => a.tourId === tourId);
      expect(covered, `tour "${tourId}" has no help article`).toBe(true);
    }
  });

  it('has an English markdown body for every registered article', () => {
    for (const slug of HELP_SLUGS) {
      expect(hasHelpDoc(slug), `article "${slug}" has no en body`).toBe(true);
    }
  });

  it('references only categories that exist', () => {
    const ids = new Set(HELP_CATEGORIES.map((c) => c.id));
    for (const article of HELP_ARTICLES) {
      expect(ids.has(article.category)).toBe(true);
    }
  });

  it('references only related slugs that exist', () => {
    const slugs = new Set(HELP_SLUGS);
    for (const article of HELP_ARTICLES) {
      for (const related of article.related ?? []) {
        expect(slugs.has(related), `unknown related slug "${related}"`).toBe(
          true,
        );
      }
    }
  });

  it('has no duplicate slugs', () => {
    expect(new Set(HELP_SLUGS).size).toBe(HELP_SLUGS.length);
  });

  it('places every article inside exactly one of its category lists', () => {
    for (const article of HELP_ARTICLES) {
      const inCategory = getArticlesByCategory(article.category).some(
        (a) => a.slug === article.slug,
      );
      expect(inCategory).toBe(true);
    }
  });
});

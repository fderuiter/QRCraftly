/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SanitizedHtml } from './SanitizedHtml';

describe('SanitizedHtml Component', () => {
  it('renders sanitized HTML content without executable script tags', () => {
    const rawHtml = '<h3>Safe Heading</h3><script>alert("xss")</script><p>Safe paragraph.</p>';
    render(<SanitizedHtml html={rawHtml} data-testid="sanitized-wrapper" />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Safe Heading');
    expect(screen.getByText('Safe paragraph.')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('strips inline event handlers from elements', () => {
    const rawHtml = '<a href="https://example.com" onclick="alert(1)" class="custom-link">Click here</a>';
    render(<SanitizedHtml html={rawHtml} />);

    const link = screen.getByRole('link', { name: 'Click here' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).not.toHaveAttribute('onclick');
    expect(link).toHaveClass('custom-link');
  });

  it('neutralizes javascript: URLs in anchor tags', () => {
    const rawHtml = '<a href="javascript:alert(1)">Unsafe Link</a>';
    render(<SanitizedHtml html={rawHtml} />);

    const link = screen.getByRole('link', { name: 'Unsafe Link' });
    expect(link).toHaveAttribute('href', '#');
  });

  it('supports custom wrapper tags (div, span, section, article)', () => {
    const { container: divContainer } = render(<SanitizedHtml html="<p>Div test</p>" as="div" className="div-class" />);
    expect(divContainer.querySelector('div.div-class')).toBeInTheDocument();

    const { container: sectionContainer } = render(<SanitizedHtml html="<p>Section test</p>" as="section" className="sec-class" />);
    expect(sectionContainer.querySelector('section.sec-class')).toBeInTheDocument();

    const { container: articleContainer } = render(<SanitizedHtml html="<p>Article test</p>" as="article" className="art-class" />);
    expect(articleContainer.querySelector('article.art-class')).toBeInTheDocument();

    const { container: spanContainer } = render(<SanitizedHtml html="<span>Span test</span>" as="span" className="span-class" />);
    expect(spanContainer.querySelector('span.span-class')).toBeInTheDocument();
  });

  it('preserves rich text formatting including headings, lists, bold, and italics', () => {
    const rawHtml = '<h2>Title</h2><ul><li>Item <strong>1</strong></li><li>Item <em>2</em></li></ul>';
    render(<SanitizedHtml html={rawHtml} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Title');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

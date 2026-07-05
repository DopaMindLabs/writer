import { render, screen } from '@/test/test-utils';
import { Kbd } from './Kbd';
import * as platform from '@/lib/shortcuts/platform';

const mockApple = (apple: boolean) =>
  vi.spyOn(platform, 'isApplePlatform').mockReturnValue(apple);

describe('Kbd', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Command glyph adjacent to the key on Apple platforms', () => {
    mockApple(true);
    render(<Kbd keys="mod+," />);
    expect(screen.getByText('⌘,')).toBeInTheDocument();
  });

  it('renders Ctrl joined with + off Apple platforms', () => {
    mockApple(false);
    render(<Kbd keys="mod+," />);
    expect(screen.getByText('Ctrl+,')).toBeInTheDocument();
  });

  it('resolves shift and letter tokens per platform', () => {
    mockApple(true);
    const { unmount } = render(<Kbd keys="mod+shift+m" />);
    expect(screen.getByText('⌘⇧M')).toBeInTheDocument();
    unmount();
    mockApple(false);
    render(<Kbd keys="mod+shift+m" />);
    expect(screen.getByText('Ctrl+Shift+M')).toBeInTheDocument();
  });

  it('passes a bare key through unchanged', () => {
    mockApple(false);
    render(<Kbd keys="?" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders a kbd element', () => {
    mockApple(true);
    render(<Kbd keys="mod+s" />);
    expect(screen.getByText('⌘S').tagName).toBe('KBD');
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from 'test/test-utils';

import { ContextSrv, setContextSrv } from 'app/core/services/context_srv';
import { toAbsoluteGrafanaUrl } from 'app/core/utils/dashboardLinks';

import { MegaMenuItemText } from './MegaMenuItemText';

const copyStringToClipboard = jest.fn();
jest.mock('app/core/utils/explore', () => ({
  copyStringToClipboard: (value: string) => copyStringToClipboard(value),
}));

describe('MegaMenuItemText', () => {
  beforeEach(() => {
    const context = new ContextSrv();
    context.isSignedIn = true;
    setContextSrv(context);
    copyStringToClipboard.mockReset();
  });

  it('shows a copy dashboard link action for dashboard URLs', () => {
    render(
      <MegaMenuItemText url="/d/abc123/my-dashboard" onPin={jest.fn()}>
        Dashboard
      </MegaMenuItemText>
    );

    expect(screen.getByLabelText('Copy dashboard link', { selector: 'button' })).toBeInTheDocument();
  });

  it('does not show a copy dashboard link action for non-dashboard URLs', () => {
    render(
      <MegaMenuItemText url="/explore" onPin={jest.fn()}>
        Explore
      </MegaMenuItemText>
    );

    expect(screen.queryByLabelText('Copy dashboard link', { selector: 'button' })).not.toBeInTheDocument();
  });

  it('copies the absolute dashboard URL when copy action is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MegaMenuItemText url="/d/abc123/my-dashboard" onPin={jest.fn()}>
        Dashboard
      </MegaMenuItemText>
    );

    await user.click(screen.getByLabelText('Copy dashboard link', { selector: 'button' }));

    expect(copyStringToClipboard).toHaveBeenCalledWith(toAbsoluteGrafanaUrl('/d/abc123/my-dashboard'));
  });
});

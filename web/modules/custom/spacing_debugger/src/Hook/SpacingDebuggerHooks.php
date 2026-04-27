<?php

declare(strict_types=1);

namespace Drupal\spacing_debugger\Hook;

use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Session\AccountProxyInterface;

/**
 * Hook implementations for the Spacing Debugger module.
 */
final class SpacingDebuggerHooks {

  public function __construct(
    private readonly AccountProxyInterface $currentUser,
  ) {}

  /**
   * Implements hook_page_attachments().
   */
  #[Hook('page_attachments')]
  public function pageAttachments(array &$attachments): void {
    $attachments['#cache']['contexts'][] = 'user.permissions';

    if (!$this->currentUser->hasPermission('use spacing debugger')) {
      return;
    }

    $attachments['#attached']['library'][] = 'spacing_debugger/debugger';
  }

}
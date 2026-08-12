import { Alert, Platform } from 'react-native';

/**
 * Cross-platform dialogs.
 *
 * `Alert.alert` is a no-op under react-native-web: nothing renders and no button
 * callback ever fires. That matters here because callers put control flow in
 * those callbacks — "expense saved -> router.back()" and "confirm -> delete" both
 * hung on web, leaving the user on a form that had in fact already written to the
 * database. These wrappers fall back to the browser's own dialogs so the same call
 * site behaves the same on both platforms.
 */

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

/**
 * Resolves true only on explicit confirmation. Dismissing the dialog — Android
 * back button, tapping outside — resolves false, so a dismissed prompt can never
 * be mistaken for approval of a destructive action.
 */
export function confirmAction({
  title,
  message,
  confirmLabel = 'OK',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

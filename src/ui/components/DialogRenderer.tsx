import {useEffect, useState} from 'react';
import {dialogService} from './DialogService';

export function DialogRenderer() {
  const [stack, setStack] = useState(dialogService.getStack());

  useEffect(() => {
    return dialogService.subscribe(() => {
      setStack(dialogService.getStack());
    });
  }, []);

  return (
    <>
      {stack.map((config) => (
        <config.component key={config.id} {...config.props} />
      ))}
    </>
  );
}

import React from 'react';

if (typeof window !== 'undefined') {
  const r = React as any;
  const target = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED || 
                 r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED || 
                 {};

  if (!target.ReactCurrentOwner) {
    target.ReactCurrentOwner = { current: null };
  }

  r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = target;
  r.__CLIENT_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = target;
}

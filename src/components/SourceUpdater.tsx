import React, { useContext, useMemo, useState, useEffect } from 'react';
import { ModelContext } from './contexts';

function useURLParams() {
  const [search, setSearch] = useState(window.location.search);
  const params = useMemo(() => new URLSearchParams(window.location.search), [search])

  useEffect(() => {
    const handleUrlChange = () => {
      setSearch(window.location.search);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('pushstate', handleUrlChange);
    window.addEventListener('replacestate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('pushstate', handleUrlChange);
      window.removeEventListener('replacestate', handleUrlChange);
    };
  }, []);

  return params;
}

export default function SourceUpdater({}: {}) {
    const params = useURLParams();
    const model = useContext(ModelContext);
    if (!model) throw new Error('No model');

    const src = params.get("src")

    useEffect(() => {
      if (!src)
      {return}

      fetch(src).then(async response => {
        const content = await response.text()
        console.log("Got file:", content)
        model.source = content
      })
    }, [src])


  return (
    <></>
  );
}

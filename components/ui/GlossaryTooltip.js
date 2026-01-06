'use client'

import Tooltip from '@/components/ui/Tooltip'

const getGlossaryDefinition = (term) => {
  if (typeof window !== 'undefined' && window != null && window.glossaryData != null) {
    return window.glossaryData[term] ?? '<glossary entry not found>';
  }
  else {
    return '<glossary data missing>';
  }
}

const GlossaryTooltip = ({children, term}) => {

  const tooltipText = `<b>${term}</b>: ${getGlossaryDefinition(term)}`;
  return <Tooltip text={tooltipText}>{children}</Tooltip>
}

export default GlossaryTooltip;
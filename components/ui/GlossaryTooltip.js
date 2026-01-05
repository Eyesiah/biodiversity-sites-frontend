'use client'

import Tooltip from '@/components/ui/Tooltip'

const getGlossaryDefinition = (term) => {
  if (window?.glossaryData) {
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
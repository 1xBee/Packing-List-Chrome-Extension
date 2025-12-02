/**
 * Packing List React Component
 * Displays packing list items in a clean, printable format
 */

const { useState, useEffect } = React;

function PackingListComponent({ itemName, itemId, packingList, uniqueKey, onReady }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Call onReady when component mounts and has data
  useEffect(() => {
    if (packingList && packingList.length > 0) {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        onReady(uniqueKey);
      }, 50);
    }
  }, [uniqueKey, packingList, onReady]);

  if (!packingList || packingList.length === 0) {
    return null;
  }

  const toggleExpanded = (e) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="packing-list-container">
      <div className="packing-list-header">
        <button 
          className="packing-list-toggle"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
        >
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="item-name">{itemName}</span>
          <span className="item-count">({packingList.length} boxes)</span>
        </button>
      </div>
      
      {isExpanded && (
        <div className="packing-list-content">
          <ul className="packing-list-items">
            {packingList.map((box, index) => (
              <li key={`${uniqueKey}-box-${index}`} className="packing-list-item">
                <span className="box-number">Box {index + 1}:</span>
                <span className="box-contents">{box.contents || box.description || 'No description'}</span>
                {box.weight && <span className="box-weight">({box.weight})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Make component available globally
window.PackingListComponent = PackingListComponent;
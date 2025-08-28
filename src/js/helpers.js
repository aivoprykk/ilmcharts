(function() {
    // Global variables
    var stationIndex = {
        stationOrder: [],
        index: new Map(),
        userSelections: new Map()
    };
    
    var testData = { /* your data here */ };
    
    // Initialize everything
    initializeStationIndex();
    
    function initializeStationIndex() {
        buildIndex(testData);
        initializeUserSelections();
        loadSavedState(); // Load from localStorage if available
    }
    
    function buildIndex(data, userOrder) {
        stationIndex.index.clear();
        
        // Set or preserve station order
        if (userOrder && Array.isArray(userOrder)) {
            stationIndex.stationOrder = userOrder.filter(function(key) {
                return key in data;
            });
        } else {
            stationIndex.stationOrder = Object.keys(data);
        }
        
        // Index all stations
        stationIndex.stationOrder.forEach(function(stationKey) {
            var station = data[stationKey];
            indexStation(stationKey, station);
        });
    }
    
    function indexStation(stationKey, station, path) {
        if (!station) return;
        
        var currentPath = path ? path + '.' + stationKey : stationKey;
        
        // Index all properties
        Object.keys(station).forEach(function(key) {
            var value = station[key];
            var propPath = currentPath + '.' + key;
            
            if (!stationIndex.index.has(key)) {
                stationIndex.index.set(key, []);
            }
            
            stationIndex.index.get(key).push({
                value: value,
                path: propPath,
                station: stationKey,
                parent: station
            });
            
            // Recursively index nested objects and arrays
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    value.forEach(function(item, index) {
                        indexStation(key + '[' + index + ']', item, currentPath);
                    });
                } else {
                    indexStation(key, value, currentPath);
                }
            }
        });
    }
    
    function initializeUserSelections() {
        stationIndex.userSelections.clear();
        
        stationIndex.stationOrder.forEach(function(stationKey) {
            var station = getStation(stationKey);
            if (!station) return;
            
            // Select first available hstations or hstations_new item
            var hstationSelection = getFirstAvailableStation(station, ['hstations', 'hstations_new']);
            var fcstationSelection = getFirstAvailableStation(station, ['fcstations']);
            
            stationIndex.userSelections.set(stationKey, {
                hstation: hstationSelection,
                fcstation: fcstationSelection
            });
        });
    }
    
    function getFirstAvailableStation(station, stationTypes) {
        for (var i = 0; i < stationTypes.length; i++) {
            var type = stationTypes[i];
            var stations = station[type];
            if (!stations) continue;
            
            if (Array.isArray(stations) && stations.length > 0) {
                return { type: type, key: '0', data: stations[0] };
            } else if (typeof stations === 'object') {
                var firstKey = Object.keys(stations)[0];
                if (firstKey) {
                    return { type: type, key: firstKey, data: stations[firstKey] };
                }
            }
        }
        return null;
    }
    
    // Public API functions
    window.stationManager = {
        // Get stations in user order
        getStationsInOrder: function() {
            return stationIndex.stationOrder.map(function(key) {
                return {
                    key: key,
                    data: getStation(key)
                };
            });
        },
        
        // Update station order
        setStationOrder: function(newOrder) {
            stationIndex.stationOrder = newOrder.filter(function(key) {
                return stationIndex.index.has(key);
            });
            saveState();
        },
        
        // User selection management
        setUserSelection: function(stationKey, selectionType, selectionKey) {
            var station = getStation(stationKey);
            if (!station) return false;
            
            var selections = stationIndex.userSelections.get(stationKey) || {};
            
            if (selectionType === 'hstation' || selectionType === 'fcstation') {
                var stationType = selectionType === 'hstation' ? 
                    ['hstations', 'hstations_new'] : ['fcstations'];
                    
                var selected = findStationSelection(station, stationType, selectionKey);
                if (selected) {
                    selections[selectionType] = selected;
                    stationIndex.userSelections.set(stationKey, selections);
                    saveState();
                    return true;
                }
            }
            return false;
        },
        
        // Get current user selections
        getUserSelections: function(stationKey) {
            if (stationKey) {
                return stationIndex.userSelections.get(stationKey);
            }
            var result = {};
            stationIndex.userSelections.forEach(function(value, key) {
                result[key] = value;
            });
            return result;
        },
        
        // Find station by key
        findStation: getStation,
        
        // Find by property key
        findByKey: function(key) {
            return stationIndex.index.get(key) || [];
        },
        
        // Get selection options for UI
        getSelectionOptions: function(stationKey, selectionType) {
            var station = getStation(stationKey);
            if (!station) return [];
            
            var stationTypes = selectionType === 'hstation' ? 
                ['hstations', 'hstations_new'] : ['fcstations'];
            
            var options = [];
            
            stationTypes.forEach(function(type) {
                var stations = station[type];
                if (!stations) return;
                
                if (Array.isArray(stations)) {
                    stations.forEach(function(item, index) {
                        options.push({
                            value: type + '[' + index + ']',
                            label: type + '.' + index + ' (' + item.id + ')',
                            data: item
                        });
                    });
                } else {
                    Object.keys(stations).forEach(function(key) {
                        var data = stations[key];
                        options.push({
                            value: key,
                            label: type + '.' + key + ' (' + data.id + ')',
                            data: data
                        });
                    });
                }
            });
            
            return options;
        },
        
        // Export/import state
        exportState: function() {
            return {
                stationOrder: stationIndex.stationOrder,
                userSelections: Array.from(stationIndex.userSelections.entries())
            };
        },
        
        importState: function(state) {
            buildIndex(testData, state.stationOrder);
            stationIndex.userSelections = new Map(state.userSelections);
        },
        
        // Refresh index with new data
        refreshIndex: function(newData) {
            testData = newData;
            var currentState = window.stationManager.exportState();
            buildIndex(newData, currentState.stationOrder);
            
            // Update selections to ensure they still exist in new data
            initializeUserSelections();
        }
    };
    
    // Helper functions
    function getStation(stationKey) {
        var stationEntry = stationIndex.index.get(stationKey);
        return stationEntry && stationEntry[0] ? stationEntry[0].parent : null;
    }
    
    function findStationSelection(station, stationTypes, selectionKey) {
        for (var i = 0; i < stationTypes.length; i++) {
            var type = stationTypes[i];
            var stations = station[type];
            if (!stations) continue;
            
            if (Array.isArray(stations)) {
                var index = parseInt(selectionKey);
                if (!isNaN(index) && index >= 0 && index < stations.length) {
                    return { type: type, key: selectionKey, data: stations[index] };
                }
            } else if (stations[selectionKey]) {
                return { type: type, key: selectionKey, data: stations[selectionKey] };
            }
        }
        return null;
    }
    
    // Persistence functions
    function saveState() {
        try {
            var data = {
                stationOrder: stationIndex.stationOrder,
                userSelections: Array.from(stationIndex.userSelections.entries())
            };
            localStorage.setItem('stationIndex', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    }
    
    function loadSavedState() {
        try {
            var saved = localStorage.getItem('stationIndex');
            if (saved) {
                var data = JSON.parse(saved);
                buildIndex(testData, data.stationOrder);
                
                if (data.userSelections) {
                    stationIndex.userSelections = new Map(data.userSelections);
                }
                return true;
            }
        } catch (e) {
            console.warn('Failed to load saved state:', e);
        }
        return false;
    }
    
    // Initialize UI components
    initializeUI();
    
    function initializeUI() {
        // Example: Create station list
        var stations = window.stationManager.getStationsInOrder();
        var $stationList = $('#station-list');
        
        stations.forEach(function(station) {
            $stationList.append(
                '<div class="station-item" data-station="' + station.key + '">' +
                station.key + ' - ' + station.data.name +
                '</div>'
            );
        });
        
        // Handle station selection
        $(document).on('click', '.station-item', function() {
            var stationKey = $(this).data('station');
            showStationDetails(stationKey);
        });
    }
    
    function showStationDetails(stationKey) {
        var selections = window.stationManager.getUserSelections(stationKey);
        var hstationOptions = window.stationManager.getSelectionOptions(stationKey, 'hstation');
        var fcstationOptions = window.stationManager.getSelectionOptions(stationKey, 'fcstation');
        
        // Update UI with station details and selection dropdowns
        updateSelectionDropdown('#hstation-select', hstationOptions, selections.hstation);
        updateSelectionDropdown('#fcstation-select', fcstationOptions, selections.fcstation);
        
        // Bind change events
        $('#hstation-select').off('change').on('change', function() {
            window.stationManager.setUserSelection(stationKey, 'hstation', $(this).val());
        });
        
        $('#fcstation-select').off('change').on('change', function() {
            window.stationManager.setUserSelection(stationKey, 'fcstation', $(this).val());
        });
    }
    
    function updateSelectionDropdown(selector, options, currentSelection) {
        var $select = $(selector).empty();
        
        options.forEach(function(option) {
            var isSelected = currentSelection && 
                currentSelection.key === option.value ? 'selected' : '';
            $select.append(
                '<option value="' + option.value + '" ' + isSelected + '>' +
                option.label +
                '</option>'
            );
        });
    }
})();
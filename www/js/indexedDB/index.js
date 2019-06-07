import { compare, dashboard } from './helpers.js';

const DB_NAME = 'sdev-demo-version-control';
const DB_VERSION = 1;
const DB_STORE_NAME = 'elements';

let db;

const openDb = () => {
    console.log('openDb ...');
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = event => {
        db = event.target.result;
        console.log('openDb DONE');
    };

    req.onerror = event => {
        console.error('openDb:', event.target.errorCode);
    };

    req.onupgradeneeded = event => {
        console.log('openDb.onupgradeneeded');
        const store = event.currentTarget.result.createObjectStore(
            DB_STORE_NAME,
            { keyPath: 'guid' }
        );

        store.createIndex('structure', 'structurecode', { unique: false });
        store.createIndex('segment', 'segmentcode', { unique: false });
        store.createIndex('material', 'material', { unique: false });
        store.createIndex('dbId', 'dbId', { unique: false });
        store.createIndex('part', 'segmentpart', { unique: false });
    };
};

/**
 * @param {string} store_name
 * @param {string} mode either "readonly" or "readwrite"
 */
const getObjectStore = (store_name, mode) => {
    const tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
};

const displayElements = store => {
    console.log('displayElements');

    if (typeof store === 'undefined')
        store = getObjectStore(DB_STORE_NAME, 'readonly');

    const $tbody = $('#quantities table tbody');
    $tbody.empty();

    let req = store.count();
    req.onsuccess = event => {
        console.log(`Total number of elements: ${event.target.result}`);
    };

    req.onerror = () => {
        console.error('add error', this.error);
    };

    let i = 1;
    const myIndex = store.index('segment');
    req = myIndex.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const value = cursor.value;
            const tr = document.createElement('tr');
            const formworkPrice = Math.round(value.properties[0].area * 10);
            const concretePrice =
                Math.round(value.properties[0].volume * 100 * 75) / 100;
            const totalPrice = formworkPrice + concretePrice;
            const areaChange = compare(value.properties, 'area');
            const volumeChange = compare(value.properties, 'volume');
            tr.innerHTML = `
                    <th scope="row">${i}</th>
                    <td>${value.structurecode}</td>
                    <td>${value.segmentcode}</td>
                    <td>${value.assemblycode}</td>
                    <td>${value.properties[0].area} ${areaChange}</td>
                    <td>${formworkPrice}</td>
                    <td>${value.material}</td>
                    <td>${Math.round(value.properties[0].volume * 100) /
                        100} ${volumeChange}</td>
                    <td>${concretePrice}</td>
                    <td>${totalPrice}`;

            $tbody.append(tr);

            cursor.continue();

            i++;
        } else {
            // console.log('No more elements');
        }
    };
};

/**
 * @param {Array} elements
 */
const addElements = elements => {
    const store = getObjectStore(DB_STORE_NAME, 'readwrite');
    let req;
    let msg = { removed: 0, added: 0 };
    req = store.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;

        // If the cursor is pointing at something, ask for the data
        if (cursor) {
            req = store.get(cursor.key);
            req.onsuccess = event => {
                const data = event.target.result;
                const elementIndex = elements.findIndex(
                    element => element.guid === data.guid
                );
                if (elementIndex === -1) {
                    req = store.delete(cursor.key);
                    req.onsuccess = () => {
                        // console.log('Element was deleted');
                        msg.removed++;
                    };
                } else {
                    data.properties = [
                        ...elements[elementIndex].properties,
                        ...data.properties
                    ];
                    req = store.put(data);
                    req.onsuccess = () => {
                        // console.log('Element was updated');
                    };
                    elements.splice(elementIndex, 1);
                }
            };

            cursor.continue();
        } else {
            console.log(elements);
            elements.forEach(element => {
                try {
                    req = store.add(element);
                } catch (err) {
                    throw err;
                }
                req.onsuccess = () => {
                    // console.log('Insertion in DB successful');
                    msg.added++;
                };
                req.onerror = event => {
                    console.log(
                        'addElement error:',
                        event.target.error.message
                    );
                };
            });
        }
    };
};

const displayDashboard = store => {
    console.log('displayDashboard');

    if (typeof store === 'undefined')
        store = getObjectStore(DB_STORE_NAME, 'readonly');

    let req;
    let segments = [];
    const myIndex = store.index('part');
    req = myIndex.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const data = cursor.value;
            const index = segments.findIndex(
                obj => obj.name === `${data.segmentcode}-${data.segmentpart}`
            );
            if (index === -1) {
                segments.push({
                    name: `${data.segmentcode}-${data.segmentpart}`,
                    totalPrice:
                        data.properties[0].area * 10 +
                        data.properties[0].volume * 75
                });
                // start++;
                // end++;
            } else {
                segments[index].totalPrice +=
                    data.properties[0].area * 10 +
                    data.properties[0].volume * 75;
            }

            cursor.continue();
        } else {
            segments.forEach(segment => {
                segment.start = Math.floor(Math.random() * 11);
                do {
                    segment.end = Math.floor(Math.random() * 11);
                } while (segment.end < segment.start);
            });
            dashboard('#charts', segments);
        }
    };
};

/**
 *
 * @param {Array} segmentNames Array containng the names of the segements containing the elements to be selected
 * @param {*} store
 */
const getDbIds = (segmentNames, store) => {
    console.log('getDbIds...');
    if (typeof store === 'undefined')
        store = getObjectStore(DB_STORE_NAME, 'readonly');

    let req;
    let dbIds = [];
    const myIndex = store.index('part');
    req = myIndex.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const data = cursor.value;
            segmentNames.forEach(segmentName => {
                if (`${data.segmentcode}-${data.segmentpart}` === segmentName) {
                    dbIds.push(data.dbId);
                }
            });

            cursor.continue();
        } else {
            NOP_VIEWER.select(dbIds, Autodesk.Viewing.SelectionMode.REGULAR);

            const overlayName = 'temporary-coloreddddd-overlay';
            const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            NOP_VIEWER.impl.createOverlayScene(overlayName, material, material);
            dbIds.forEach(dbid => {
                const it = NOP_VIEWER.model.getData().instanceTree;

                it.enumNodeFragments(
                    dbid,
                    fragId => {
                        const renderProxy = NOP_VIEWER.impl.getRenderProxy(
                            NOP_VIEWER.model,
                            fragId
                        );

                        renderProxy.meshProxy = new THREE.Mesh(
                            renderProxy.geometry,
                            renderProxy.material
                        );

                        renderProxy.meshProxy.matrix.copy(
                            renderProxy.matrixWorld
                        );
                        renderProxy.meshProxy.matrixWorldNeedsUpdate = true;
                        renderProxy.meshProxy.matrixAutoUpdate = false;
                        renderProxy.meshProxy.frustumCulled = false;
                        NOP_VIEWER.impl.addOverlay(
                            overlayName,
                            renderProxy.meshProxy
                        );
                        NOP_VIEWER.impl.invalidate(true);
                    },
                    false
                );
            });
        }
    };
};

export { addElements, openDb, displayElements, displayDashboard, getDbIds };

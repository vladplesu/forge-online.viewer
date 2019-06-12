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

/**
 * @param {*} index
 * @param {*} [store=DB_STORE_NAME]
 * @returns
 */
const getElements = (index, store) => {
    return new Promise((resolve, reject) => {
        console.log('getElements');

        if (typeof store === 'undefined')
            store = getObjectStore(DB_STORE_NAME, 'readonly');

        let elements = [];
        const myIndex = store.index(index);
        const req = myIndex.openCursor();
        req.onsuccess = event => {
            const cursor = event.target.result;
            if (cursor) {
                elements = [...elements, cursor.value];
                cursor.continue();
            } else {
                console.log('No more elements');
                resolve(elements);
            }
        };

        req.onerror = err => {
            reject(err);
        };
    });
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

/**
 *
 * @param {Array} segmentNames Array containng the names of the segements containing the elements to be selected
 * @param {string} store
 */
const getDbIds = (segmentNames, store) => {
    return new Promise((resolve, reject) => {
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
                    if (
                        `${data.segmentcode}-${data.segmentpart}` ===
                        segmentName
                    ) {
                        dbIds.push(data.dbId);
                    }
                });

                cursor.continue();
            } else {
                resolve(dbIds);
                // dbIds.forEach(dbid => {
                //     NOP_VIEWER.clearThemingColors(NOP_VIEWER.model);
                //     NOP_VIEWER.impl.visibilityManager.show(dbid, NOP_VIEWER.model);
                //     NOP_VIEWER.setThemingColor(
                //         dbid,
                //         new THREE.Vector4(1, 0, 0, 1),
                //         NOP_VIEWER.model
                //     );
                // });
                // const overlayName = 'temporary-coloreddddd-overlay';
                // const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                // NOP_VIEWER.impl.createOverlayScene(overlayName, material, material);
                // dbIds.forEach(dbid => {
                //     const it = NOP_VIEWER.model.getData().instanceTree;
                //     it.enumNodeFragments(
                //         dbid,
                //         fragId => {
                //             const renderProxy = NOP_VIEWER.impl.getRenderProxy(
                //                 NOP_VIEWER.model,
                //                 fragId
                //             );
                //             renderProxy.meshProxy = new THREE.Mesh(
                //                 renderProxy.geometry,
                //                 renderProxy.material
                //             );
                //             renderProxy.meshProxy.matrix.copy(
                //                 renderProxy.matrixWorld
                //             );
                //             renderProxy.meshProxy.matrixWorldNeedsUpdate = true;
                //             renderProxy.meshProxy.matrixAutoUpdate = false;
                //             renderProxy.meshProxy.frustumCulled = false;
                //             NOP_VIEWER.impl.addOverlay(
                //                 overlayName,
                //                 renderProxy.meshProxy
                //             );
                //             NOP_VIEWER.impl.invalidate(true);
                //         },
                //         false
                //     );
                // });
            }
        };

        req.onerror = err => {
            reject(err);
        };
    });
};

export { addElements, openDb, getElements, getDbIds };

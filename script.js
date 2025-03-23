// データ管理用のクラス
class MobileLineManager {
    constructor() {
        this.lines = JSON.parse(localStorage.getItem('mobileLines')) || [];
        this.carriers = JSON.parse(localStorage.getItem('carriers')) || [];
        this.people = JSON.parse(localStorage.getItem('people')) || [];
        this.currentSort = { field: 'contractDate', direction: 'asc' };
        this.searchText = '';
        this.filters = {
            carrier: '',
            owner: '',
            user: '',
            hasBullet: ''
        };
        
        // 古いデータの移行処理
        this.migrateOldData();
        
        this.initializeApp();
    }
    
    // 古いデータ形式から新しいデータ形式への移行
    migrateOldData() {
        // 古いユーザーと所有者のデータがあるかチェック
        const oldOwners = JSON.parse(localStorage.getItem('owners')) || [];
        const oldUsers = JSON.parse(localStorage.getItem('users')) || [];
        
        // 名義と利用者のデータを統合して重複を排除
        if (oldOwners.length > 0 || oldUsers.length > 0) {
            this.people = [...new Set([...this.people, ...oldOwners, ...oldUsers])];
            localStorage.setItem('people', JSON.stringify(this.people));
            
            // 古いデータを削除
            localStorage.removeItem('owners');
            localStorage.removeItem('users');
            
            // もし既存のレコードに弾フィールドがなければ追加
            this.lines.forEach(line => {
                if (line.hasBullet === undefined) {
                    line.hasBullet = false;
                }
            });
            
            // 更新したデータを保存
            localStorage.setItem('mobileLines', JSON.stringify(this.lines));
        }
    }

    // アプリケーションの初期化
    initializeApp() {
        this.setupFormHandlers();
        this.setupSelectHandlers();
        this.setupAddOptionHandlers(); // 追加ボタンのハンドラ設定
        this.setupDeleteOptionHandlers();
        this.updateSelectOptions();
        this.setupSortHandlers();
        this.setupPhoneNumberValidation();
        this.setupSearchAndFilter(); // 検索とフィルター機能の初期化
        this.displayLines();
        this.setupContractPeriodHandler();
        this.setupFormToggle();
    }

    // 検索とフィルター機能の設定
    setupSearchAndFilter() {
        const searchInput = document.getElementById('searchInput');
        const filterCarrier = document.getElementById('filterCarrier');
        const filterOwner = document.getElementById('filterOwner');
        const filterUser = document.getElementById('filterUser');
        const filterBullet = document.getElementById('filterBullet');

        // フィルターの選択肢を更新
        this.updateFilterOptions();

        // イベントリスナーの設定
        searchInput.addEventListener('input', () => {
            this.searchText = searchInput.value.toLowerCase();
            this.displayLines();
        });

        filterCarrier.addEventListener('change', () => {
            this.filters.carrier = filterCarrier.value;
            this.displayLines();
        });

        filterOwner.addEventListener('change', () => {
            this.filters.owner = filterOwner.value;
            this.displayLines();
        });
        
        filterUser.addEventListener('change', () => {
            this.filters.user = filterUser.value;
            this.displayLines();
        });
        
        filterBullet.addEventListener('change', () => {
            this.filters.hasBullet = filterBullet.value;
            this.displayLines();
        });
    }

    // フィルターの選択肢を更新
    updateFilterOptions() {
        const filterCarrier = document.getElementById('filterCarrier');
        const filterOwner = document.getElementById('filterOwner');
        const filterUser = document.getElementById('filterUser');

        // キャリアのフィルター選択肢
        filterCarrier.innerHTML = '<option value="">キャリア: すべて</option>';
        [...new Set(this.lines.map(line => line.carrier))]
            .filter(carrier => carrier)
            .sort()
            .forEach(carrier => {
                const option = document.createElement('option');
                option.value = carrier;
                option.textContent = carrier;
                filterCarrier.appendChild(option);
            });

        // 名義のフィルター選択肢
        filterOwner.innerHTML = '<option value="">名義: すべて</option>';
        [...new Set(this.lines.map(line => line.owner))]
            .filter(owner => owner)
            .sort()
            .forEach(owner => {
                const option = document.createElement('option');
                option.value = owner;
                option.textContent = owner;
                filterOwner.appendChild(option);
            });
            
        // 利用者のフィルター選択肢
        filterUser.innerHTML = '<option value="">利用者: すべて</option>';
        [...new Set(this.lines.map(line => line.user))]
            .filter(user => user)
            .sort()
            .forEach(user => {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                filterUser.appendChild(option);
            });
    }

    // フォームトグル機能の設定
    setupFormToggle() {
        const toggleBtn = document.getElementById('toggleForm');
        const formSection = document.getElementById('formSection');

        toggleBtn.addEventListener('click', () => {
            formSection.classList.toggle('hidden');
        });
    }

    // 電話番号のバリデーション設定
    setupPhoneNumberValidation() {
        const phoneInput = document.getElementById('phoneNumber');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d-]/g, '');
            if (value.length > 0) {
                value = value.replace(/^(\d{2,3})(\d{4})(\d{4})$/, '$1-$2-$3');
            }
            e.target.value = value;
        });
    }

    // 選択肢追加ハンドラーの設定
    setupAddOptionHandlers() {
        const addButtons = document.querySelectorAll('.add-option-btn');
        addButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                this.addOption(target);
            });
        });
    }

    // 選択肢の追加
    addOption(target) {
        const newFieldId = `new${target.charAt(0).toUpperCase() + target.slice(1)}`;
        const newValue = document.getElementById(newFieldId).value.trim();

        if (newValue) {
            if (target === 'owner' || target === 'user') {
                // 名義と利用者は共通リストに追加
                if (!this.people.includes(newValue)) {
                    this.people.push(newValue);
                    localStorage.setItem('people', JSON.stringify(this.people));
                    // 名義と利用者の両方のセレクトボックスを更新
                    this.updatePeopleSelectOptions();
                }
            } else {
                // キャリアなど他の選択肢は個別のリストに追加
                const arrayName = `${target}s`;
                if (!this[arrayName].includes(newValue)) {
                    this[arrayName].push(newValue);
                    localStorage.setItem(arrayName, JSON.stringify(this[arrayName]));
                    this.updateSelectOptions();
                }
            }
            
            // 選択肢を追加した後、その値を選択状態にする
            const selectElement = document.getElementById(target);
            selectElement.value = newValue;
            
            // 入力欄をクリア
            document.getElementById(newFieldId).value = '';
        }
    }

    // 選択肢削除ハンドラーの設定
    setupDeleteOptionHandlers() {
        const deleteButtons = document.querySelectorAll('.delete-option-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                this.showDeleteOptionsModal(target);
            });
        });
    }

    // 選択肢削除モーダルの表示
    showDeleteOptionsModal(target) {
        // 既存のモーダルを削除
        const existingModal = document.querySelector('.option-modal');
        if (existingModal) {
            existingModal.remove();
        }

        let options;
        if (target === 'owner' || target === 'user') {
            options = this.people;
        } else {
            options = this[`${target}s`];
        }
        
        if (!options || options.length === 0) {
            alert('削除可能な選択肢がありません。');
            return;
        }

        // モーダルオーバーレイの作成
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);

        // モーダルの作成
        const modal = document.createElement('div');
        modal.className = 'option-modal';
        modal.innerHTML = `
            <h3>${this.getTargetLabel(target)}の選択肢削除</h3>
            <ul>
                ${options.map(option => `
                    <li>
                        ${option}
                        <button onclick="mobileLineManager.deleteOption('${target}', '${option}')">削除</button>
                    </li>
                `).join('')}
            </ul>
            <button onclick="this.closest('.option-modal').remove();document.querySelector('.modal-overlay').remove()">閉じる</button>
        `;
        document.body.appendChild(modal);
    }

    // 選択肢の削除
    deleteOption(target, option) {
        if (confirm(`${option}を削除してもよろしいですか？`)) {
            if (target === 'owner' || target === 'user') {
                // 名義・利用者は共通リストから削除
                this.people = this.people.filter(item => item !== option);
                localStorage.setItem('people', JSON.stringify(this.people));
                this.updatePeopleSelectOptions();
            } else {
                // それ以外は個別リストから削除
                const arrayName = `${target}s`;
                this[arrayName] = this[arrayName].filter(item => item !== option);
                localStorage.setItem(arrayName, JSON.stringify(this[arrayName]));
                this.updateSelectOptions();
            }
            
            document.querySelector('.option-modal').remove();
            document.querySelector('.modal-overlay').remove();
        }
    }

    // ターゲットのラベル取得
    getTargetLabel(target) {
        const labels = {
            carrier: 'キャリア',
            owner: '名義',
            user: '利用者'
        };
        return labels[target] || target;
    }

    // セレクトボックスハンドラーの設定
    setupSelectHandlers() {
        const selectors = [
            { select: 'carrier', new: 'newCarrier' },
            { select: 'owner', new: 'newOwner' },
            { select: 'user', new: 'newUser' }
        ];

        selectors.forEach(({ select, new: newField }) => {
            const selectEl = document.getElementById(select);
            const newEl = document.getElementById(newField);
            const addBtn = selectEl.parentElement.querySelector('.add-option-btn');

            selectEl.addEventListener('change', () => {
                // 「新規追加」を選択した場合のみ入力欄を表示
                if (selectEl.value === 'other') {
                    newEl.classList.remove('hidden');
                } else {
                    newEl.classList.add('hidden');
                    newEl.value = '';
                }
            });

            addBtn.addEventListener('click', () => {
                const newValue = newEl.value.trim();
                if (newValue) {
                    if (select === 'owner' || select === 'user') {
                        // 名義と利用者は共通リストに追加
                        if (!this.people.includes(newValue)) {
                            this.people.push(newValue);
                            localStorage.setItem('people', JSON.stringify(this.people));
                            this.updatePeopleSelectOptions();
                        }
                    } else {
                        if (!this[`${select}s`].includes(newValue)) {
                            this[`${select}s`].push(newValue);
                            localStorage.setItem(`${select}s`, JSON.stringify(this[`${select}s`]));
                            this.updateSelectOptions();
                        }
                    }
                    newEl.value = '';
                    selectEl.value = newValue;
                }
            });
        });
    }

    // セレクトボックスのオプション更新
    updateSelectOptions() {
        const carrierId = 'carrier';
        const select = document.getElementById(carrierId);
        // 現在選択されている値を記憶
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">選択してください</option>';

        let storedItems = JSON.parse(localStorage.getItem('carriers')) || [];
        storedItems = [...new Set(storedItems)].sort();

        storedItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });

        const otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = '新規追加';
        select.appendChild(otherOption);
        
        // 以前選択されていた値があれば、それを選択状態に戻す
        if (currentValue && (storedItems.includes(currentValue) || currentValue === 'other')) {
            select.value = currentValue;
        }
        
        // 名義・利用者の選択肢を更新
        this.updatePeopleSelectOptions();
        
        // フィルターオプションも更新
        this.updateFilterOptions();
    }
    
    // 名義と利用者の選択肢を共通リストから更新
    updatePeopleSelectOptions() {
        const selectors = ['owner', 'user'];
        
        selectors.forEach(id => {
            const select = document.getElementById(id);
            const currentValue = select.value;
            
            select.innerHTML = '<option value="">選択してください</option>';
            
            let storedPeople = [...new Set(this.people)].sort();
            
            storedPeople.forEach(person => {
                const option = document.createElement('option');
                option.value = person;
                option.textContent = person;
                select.appendChild(option);
            });
            
            const otherOption = document.createElement('option');
            otherOption.value = 'other';
            otherOption.textContent = '新規追加';
            select.appendChild(otherOption);
            
            // 以前選択されていた値があれば、それを選択状態に戻す
            if (currentValue && (storedPeople.includes(currentValue) || currentValue === 'other')) {
                select.value = currentValue;
            }
        });
        
        // フィルターオプションも更新
        this.updateFilterOptions();
    }

    // 解約可能日の計算（ソート用）
    calculateCancellationDate(line) {
        if (!line.contractDate || !line.contractPeriod) return null;
        
        const date = new Date(line.contractDate);
        date.setMonth(date.getMonth() + parseInt(line.contractPeriod));
        return date;
    }
    
    // 解約可能日が過ぎているかどうかのチェック
    isExpiryPassed(date) {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }

    // ソートハンドラーの設定
    setupSortHandlers() {
        const headers = document.querySelectorAll('th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                this.handleSort(field);
            });
        });
    }

    // ソート処理
    handleSort(field) {
        const headers = document.querySelectorAll('th.sortable');
        headers.forEach(header => {
            if (header.dataset.sort === field) {
                if (this.currentSort.field === field) {
                    this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                    header.classList.toggle('sort-asc', this.currentSort.direction === 'asc');
                    header.classList.toggle('sort-desc', this.currentSort.direction === 'desc');
                } else {
                    this.currentSort.field = field;
                    this.currentSort.direction = 'asc';
                    header.classList.add('sort-asc');
                    header.classList.remove('sort-desc');
                }
            } else {
                header.classList.remove('sort-asc', 'sort-desc');
            }
        });

        this.sortLines();
        this.displayLines();
    }

    // データのソート
    sortLines() {
        const { field, direction } = this.currentSort;
        this.lines.sort((a, b) => {
            let valueA, valueB;
            
            // 解約可能日は特別処理
            if (field === 'cancellationDate') {
                valueA = this.calculateCancellationDate(a);
                valueB = this.calculateCancellationDate(b);
                
                // 日付が存在しない場合は最後に表示
                if (!valueA && !valueB) return 0;
                if (!valueA) return direction === 'asc' ? 1 : -1;
                if (!valueB) return direction === 'asc' ? -1 : 1;
            } else {
                valueA = a[field] || '';
                valueB = b[field] || '';
                
                if (field === 'contractDate') {
                    valueA = valueA ? new Date(valueA) : new Date(0);
                    valueB = valueB ? new Date(valueB) : new Date(0);
                }
                else if (field === 'contractPeriod') {
                    valueA = valueA ? Number(valueA) : 0;
                    valueB = valueB ? Number(valueB) : 0;
                }
                else if (field === 'hasBullet') {
                    // 真偽値のソート
                    return direction === 'asc' 
                        ? (valueA === valueB ? 0 : valueA ? -1 : 1)
                        : (valueA === valueB ? 0 : valueA ? 1 : -1);
                }
                else {
                    valueA = valueA ? valueA.toString().toLowerCase() : '';
                    valueB = valueB ? valueB.toString().toLowerCase() : '';
                }
            }

            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // フォームハンドラーの設定
    setupFormHandlers() {
        const form = document.getElementById('mobileLineForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.handleFormSubmit();
            }
        });
    }

    // フォームバリデーション
    validateForm() {
        const phoneNumber = document.getElementById('phoneNumber').value;
        if (!phoneNumber.match(/^\d{2,3}-\d{4}-\d{4}$/)) {
            alert('電話番号の形式が正しくありません。\n例：090-1234-5678');
            return false;
        }
        return true;
    }

    // 契約期間による解約可能日の自動計算
    setupContractPeriodHandler() {
        const contractDate = document.getElementById('contractDate');
        const contractPeriod = document.getElementById('contractPeriod');
        const cancellationDate = document.getElementById('cancellationDate');

        const updateCancellationDate = () => {
            if (contractDate.value && contractPeriod.value) {
                const date = new Date(contractDate.value);
                date.setMonth(date.getMonth() + parseInt(contractPeriod.value));
                cancellationDate.value = date.toLocaleDateString('ja-JP');
            } else {
                cancellationDate.value = '';
            }
        };

        contractDate.addEventListener('change', updateCancellationDate);
        contractPeriod.addEventListener('input', updateCancellationDate);
    }

    // 複製機能
    duplicateLine(id) {
        const lineToDuplicate = this.lines.find(line => line.id === id);
        if (lineToDuplicate) {
            const newFormData = { ...lineToDuplicate };
            delete newFormData.id; // IDを削除して新規登録扱いにする
            document.getElementById('mobileLineForm').dataset.editId = ''; // 編集IDをクリア
            this.setFormData(newFormData);
            const formSection = document.getElementById('formSection');
            formSection.classList.remove('hidden'); // フォームを表示
            formSection.scrollIntoView({ behavior: 'smooth' }); // フォームまでスクロール
        }
    }

    // フォームにデータをセット
    setFormData(formData) {
        document.getElementById('phoneNumber').value = formData.phoneNumber || '';
        document.getElementById('contractDate').value = formData.contractDate || '';
        document.getElementById('contractPeriod').value = formData.contractPeriod || '';
        document.getElementById('cancellationDate').value = formData.cancellationDate || '';
        document.getElementById('notes').value = formData.notes || '';
        document.getElementById('hasBullet').checked = formData.hasBullet || false;

        // セレクトボックスの値を設定
        this.setSelectValue('carrier', formData.carrier || '');
        this.setSelectValue('owner', formData.owner || '');
        this.setSelectValue('user', formData.user || '');
    }
    
    // セレクトボックスに値をセット
    setSelectValue(fieldId, value) {
        const selectEl = document.getElementById(fieldId);
        const newFieldId = `new${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`;
        const newEl = document.getElementById(newFieldId);
        
        // 空の値の場合は「選択してください」を選択
        if (!value) {
            selectEl.value = '';
            newEl.value = '';
            newEl.classList.add('hidden');
            return;
        }
        
        // フィールドによって処理を分ける
        let options;
        if (fieldId === 'owner' || fieldId === 'user') {
            options = this.people;
        } else {
            options = this[`${fieldId}s`];
        }
        
        // 既存の選択肢にある場合
        if (options.includes(value)) {
            selectEl.value = value;
            newEl.value = '';
            newEl.classList.add('hidden');
        } 
        // 値が存在するが選択肢にない場合は追加して選択
        else {
            if (fieldId === 'owner' || fieldId === 'user') {
                // 名義と利用者は共通リストに追加
                this.people.push(value);
                localStorage.setItem('people', JSON.stringify(this.people));
                this.updatePeopleSelectOptions();
            } else {
                this[`${fieldId}s`].push(value);
                localStorage.setItem(`${fieldId}s`, JSON.stringify(this[`${fieldId}s`]));
                this.updateSelectOptions();
            }
            selectEl.value = value;
            newEl.classList.add('hidden');
        }
    }

    // フォーム送信処理
    handleFormSubmit() {
        const formData = this.getFormData();

        // 新規項目の処理（新規追加の場合のみ）
        ['carrier', 'owner', 'user'].forEach(field => {
            const selectEl = document.getElementById(field);
            
            if (selectEl.value === 'other') {
                const newEl = document.getElementById(`new${field.charAt(0).toUpperCase() + field.slice(1)}`);
                const newValue = newEl.value.trim();
                
                if (newValue) {
                    if (field === 'owner' || field === 'user') {
                        // 名義と利用者は共通リストに追加
                        if (!this.people.includes(newValue)) {
                            this.people.push(newValue);
                            localStorage.setItem('people', JSON.stringify(this.people));
                        }
                        formData[field] = newValue;
                    } else {
                        // キャリアなど他の項目は個別リストに追加
                        const arrayName = `${field}s`;
                        if (!this[arrayName].includes(newValue)) {
                            this[arrayName].push(newValue);
                            localStorage.setItem(arrayName, JSON.stringify(this[arrayName]));
                        }
                        formData[field] = newValue;
                    }
                } else {
                    // 「新規追加」を選んだのに値が空の場合は空文字列を設定
                    formData[field] = '';
                }
            }
        });

        const existingIndex = this.lines.findIndex(line => line.id === formData.id);
        if (existingIndex >= 0) {
            this.lines[existingIndex] = formData;
        } else {
            formData.id = Date.now().toString();
            this.lines.push(formData);
        }

        localStorage.setItem('mobileLines', JSON.stringify(this.lines));
        this.updateSelectOptions();
        this.updatePeopleSelectOptions();
        this.updateFilterOptions();
        this.sortLines();
        this.displayLines();
        document.getElementById('mobileLineForm').reset();
        document.getElementById('formSection').classList.add('hidden');
    }

    // フォームデータの取得
    getFormData() {
        const data = {
            id: document.getElementById('mobileLineForm').dataset.editId || '',
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            contractDate: document.getElementById('contractDate').value,
            contractPeriod: document.getElementById('contractPeriod').value.trim() || '',
            cancellationDate: document.getElementById('cancellationDate').value,
            notes: document.getElementById('notes').value.trim() || '',
            hasBullet: document.getElementById('hasBullet').checked
        };

        // セレクトボックスの値を取得
        ['carrier', 'owner', 'user'].forEach(field => {
            const selectEl = document.getElementById(field);
            
            if (selectEl.value === 'other') {
                // 新規入力の場合
                const newEl = document.getElementById(`new${field.charAt(0).toUpperCase() + field.slice(1)}`);
                data[field] = newEl.value.trim() || '';
            } else {
                // 既存の選択肢から選択した場合
                data[field] = selectEl.value || '';
            }
        });

        return data;
    }
    
    // 弾の状態を切り替え
    toggleBullet(id) {
        const lineIndex = this.lines.findIndex(line => line.id === id);
        if (lineIndex >= 0) {
            this.lines[lineIndex].hasBullet = !this.lines[lineIndex].hasBullet;
            localStorage.setItem('mobileLines', JSON.stringify(this.lines));
            this.displayLines();
        }
    }

    // データの表示
    displayLines() {
        const tbody = document.querySelector('#mobileLineTable tbody');
        tbody.innerHTML = '';

        // 検索とフィルター条件に基づいてデータをフィルタリング
        const filteredLines = this.lines.filter(line => {
            // テキスト検索
            const searchMatches = !this.searchText ||
                Object.values(line).some(value => {
                    // 真偽値は文字列検索の対象から除外
                    if (typeof value === 'boolean') return false;
                    return value && value.toString().toLowerCase().includes(this.searchText);
                });

            // キャリアフィルター
            const carrierMatches = !this.filters.carrier ||
                line.carrier === this.filters.carrier;

            // 名義フィルター
            const ownerMatches = !this.filters.owner ||
                line.owner === this.filters.owner;
                
            // 利用者フィルター
            const userMatches = !this.filters.user ||
                line.user === this.filters.user;
                
            // 弾フィルター - 「弾」のみフィルタリング
            const bulletMatches = this.filters.hasBullet === '' ||
                (this.filters.hasBullet === 'true' && line.hasBullet);

            return searchMatches && carrierMatches && ownerMatches && userMatches && bulletMatches;
        });

        // フィルタリング結果を表示
        filteredLines.forEach(line => {
            // 解約可能日の計算と表示クラスの処理
            let cancellationDateText = '';
            let expiryClass = '';
            if (line.contractDate && line.contractPeriod) {
                const date = new Date(line.contractDate);
                date.setMonth(date.getMonth() + parseInt(line.contractPeriod));
                cancellationDateText = date.toLocaleDateString('ja-JP');
                
                // 解約可能日が過ぎている場合はクラスを追加
                if (this.isExpiryPassed(date)) {
                    expiryClass = 'expiry-passed';
                }
            }
            
            // 弾アイコンの作成
            const bulletToggle = `
                <div class="bullet-toggle ${line.hasBullet ? '' : 'inactive'}" 
                     onclick="mobileLineManager.toggleBullet('${line.id}')" 
                     title="${line.hasBullet ? '弾として利用中' : '非弾'}">${line.hasBullet ? '弾' : '-'}</div>
            `;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${line.phoneNumber}</td>
                <td>${line.contractDate ? new Date(line.contractDate).toLocaleDateString('ja-JP') : ''}</td>
                <td>${line.carrier || ''}</td>
                <td>${line.contractPeriod ? line.contractPeriod + 'ヶ月' : ''}</td>
                <td class="${expiryClass}">${cancellationDateText}</td>
                <td>${line.owner || ''}</td>
                <td>${line.user || ''}</td>
                <td class="center-align">${bulletToggle}</td>
                <td>${line.notes || ''}</td>
                <td>
                    <button class="edit-btn" onclick="mobileLineManager.editLine('${line.id}')">編集</button>
                    <button class="delete-btn" onclick="mobileLineManager.deleteLine('${line.id}')">削除</button>
                    <button class="duplicate-btn" onclick="mobileLineManager.duplicateLine('${line.id}')">複製</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // データの編集
    editLine(id) {
        const line = this.lines.find(line => line.id === id);
        if (!line) return;

        const form = document.getElementById('mobileLineForm');
        form.dataset.editId = id;

        // まず選択肢を最新の状態に更新
        this.updateSelectOptions();
        this.updatePeopleSelectOptions();

        // フォームの値を設定
        document.getElementById('phoneNumber').value = line.phoneNumber || '';
        document.getElementById('contractDate').value = line.contractDate || '';
        document.getElementById('contractPeriod').value = line.contractPeriod || '';
        document.getElementById('cancellationDate').value = line.cancellationDate || '';
        document.getElementById('notes').value = line.notes || '';
        document.getElementById('hasBullet').checked = line.hasBullet || false;

        // セレクトボックスの値を設定
        ['carrier', 'owner', 'user'].forEach(field => {
            const selectEl = document.getElementById(field);
            const newFieldId = `new${field.charAt(0).toUpperCase() + field.slice(1)}`;
            const newEl = document.getElementById(newFieldId);
            const value = line[field] || '';
            
            // 値が空の場合は「選択してください」を選択
            if (!value) {
                selectEl.value = '';
                newEl.value = '';
                newEl.classList.add('hidden');
                return;
            }
            
            // 選択肢を取得
            let options;
            if (field === 'owner' || field === 'user') {
                options = this.people;
            } else {
                options = this[`${field}s`];
            }
            
            // 既存の選択肢にある場合
            if (options.includes(value)) {
                selectEl.value = value;
                newEl.value = '';
                newEl.classList.add('hidden');
            } 
            // 値が存在するが選択肢にない場合は追加して選択
            else {
                if (field === 'owner' || field === 'user') {
                    this.people.push(value);
                    localStorage.setItem('people', JSON.stringify(this.people));
                    this.updatePeopleSelectOptions();
                } else {
                    this[`${field}s`].push(value);
                    localStorage.setItem(`${field}s`, JSON.stringify(this[`${field}s`]));
                    this.updateSelectOptions();
                }
                selectEl.value = value;
                newEl.classList.add('hidden');
            }
        });

        const formSection = document.getElementById('formSection');
        formSection.classList.remove('hidden');
        formSection.scrollIntoView({ behavior: 'smooth' });
    }

    // データの削除
    deleteLine(id) {
        if (confirm('本当に削除しますか？')) {
            this.lines = this.lines.filter(line => line.id !== id);
            localStorage.setItem('mobileLines', JSON.stringify(this.lines));
            this.displayLines();
        }
    }
}

// アプリケーションの初期化
const mobileLineManager = new MobileLineManager();
/**
* Theme: Syntra Admin Template
* Author: Mannat-themes
* Form-Advance
*/



    jQuery(document).ready(function() {
        // Clock pickers
        $('#single-input').clockpicker({
            placement: 'bottom',
            align: 'left',
            autoclose: true,
            'default': 'now'
        });
        $('.clockpicker').clockpicker({
            donetext: 'Done',
        }).find('input').change(function() {
            console.log(this.value);
        });

        $('#check-minutes').click(function(e){
            // Have to stop propagation here
            e.stopPropagation();
            input.clockpicker('show')
                    .clockpicker('toggleView', 'minutes');
        });


        //date-picker

        $('#datetimepicker4').datetimepicker({
            format: 'L'
        });

        $('#datetimepicker10').datetimepicker({
            viewMode: 'years'
        });

         $('#datetimepicker13').datetimepicker({
            inline: true,
            sideBySide: true
        });

          // MAterial Date picker    
        $('#mdate').bootstrapMaterialDatePicker({ weekStart : 0, time: false });
             $('#timepicker').bootstrapMaterialDatePicker({ format : 'HH:mm', time: true, date: false });
        $('#date-format').bootstrapMaterialDatePicker({ format : 'dddd DD MMMM YYYY - HH:mm' });
       
            $('#min-date').bootstrapMaterialDatePicker({ format : 'DD/MM/YYYY HH:mm', minDate : new Date() });
        // Clock pickers
        $('#single-input').clockpicker({
            placement: 'bottom',
            align: 'left',
            autoclose: true,
            'default': 'now'
        });

        // Switchery
        var elems = Array.prototype.slice.call(document.querySelectorAll('.js-switch'));
                 $('[data-plugin="switchery"]').each(function (idx, obj) {
            new Switchery($(this)[0], $(this).data());
        });
            
        // Tags Input
        jQuery('#tags').tagsInput({width:'auto'});

        // Form Toggles
        jQuery('.toggle').toggles({on: true});

       
        //colorpicker start

        
        $(".colorpicker").asColorPicker();
        
        $(".gradient-colorpicker").asColorPicker({
            mode: 'gradient'
        });

        $(".complex-colorpicker").asColorPicker({
            mode: 'complex'
        });
         


        //multiselect start

        $('#my_multi_select1').multiSelect();
        $('#my_multi_select2').multiSelect({
            selectableOptgroup: true
        });

        $('#my_multi_select3').multiSelect({
            selectableHeader: "<input type='text' class='form-control search-input' autocomplete='off' placeholder='search...'>",
            selectionHeader: "<input type='text' class='form-control search-input' autocomplete='off' placeholder='search...'>",
            afterInit: function (ms) {
                var that = this,
                    $selectableSearch = that.$selectableUl.prev(),
                    $selectionSearch = that.$selectionUl.prev(),
                    selectableSearchString = '#' + that.$container.attr('id') + ' .ms-elem-selectable:not(.ms-selected)',
                    selectionSearchString = '#' + that.$container.attr('id') + ' .ms-elem-selection.ms-selected';

                that.qs1 = $selectableSearch.quicksearch(selectableSearchString)
                    .on('keydown', function (e) {
                        if (e.which === 40) {
                            that.$selectableUl.focus();
                            return false;
                        }
                    });

                that.qs2 = $selectionSearch.quicksearch(selectionSearchString)
                    .on('keydown', function (e) {
                        if (e.which == 40) {
                            that.$selectionUl.focus();
                            return false;
                        }
                    });
            },
            afterSelect: function () {
                this.qs1.cache();
                this.qs2.cache();
            },
            afterDeselect: function () {
                this.qs1.cache();
                this.qs2.cache();
            }
        });

        //spinner start
        $('#spinner1').spinner();
        $('#spinner2').spinner({disabled: true});
        $('#spinner3').spinner({value:0, min: 0, max: 10});
        $('#spinner4').spinner({value:0, step: 5, min: 0, max: 200});
        //spinner end

        // Select2
        jQuery(".select2").select2({
            width: '100%'
        });
    });
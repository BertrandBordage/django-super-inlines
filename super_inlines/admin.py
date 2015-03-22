# coding: utf-8

from __future__ import unicode_literals

from django.contrib.admin import helpers
from django.contrib.admin.options import InlineModelAdmin


class SuperInlineModelAdmin(InlineModelAdmin):
    inlines = ()

    def get_inline_instances(self, request, obj=None):
        inline_instances = []
        for inline_class in self.inlines:
            inline = inline_class(self.model, self.admin_site)
            if request:
                if not (inline.has_add_permission(request) or
                        inline.has_change_permission(request, obj) or
                        inline.has_delete_permission(request, obj)):
                    continue
                if not inline.has_add_permission(request):
                    inline.max_num = 0
            inline_instances.append(inline)

        return inline_instances

    def get_formsets_with_inlines(self, request, obj=None):
        """
        Yields formsets and the corresponding inlines.
        """
        for inline in self.get_inline_instances(request, obj):
            yield inline.get_formset(request, obj), inline

    def _create_formsets(self, request, obj, change):
        "Helper function to generate formsets for add/change_view."
        formsets = []
        inline_instances = []
        prefixes = {}
        get_formsets_args = [request]
        if change:
            get_formsets_args.append(obj)
        for FormSet, inline in self.get_formsets_with_inlines(
                *get_formsets_args):
            prefix = FormSet.get_default_prefix()
            prefixes[prefix] = prefixes.get(prefix, 0) + 1
            if prefixes[prefix] != 1 or not prefix:
                prefix = "%s-%s" % (prefix, prefixes[prefix])
            formset_params = {
                'instance': obj,
                'prefix': prefix,
                'queryset': inline.get_queryset(request),
            }
            if request.method == 'POST':
                formset_params.update({
                    'data': request.POST,
                    'files': request.FILES,
                    'save_as_new': '_saveasnew' in request.POST
                })
            formsets.append(FormSet(**formset_params))
            inline_instances.append(inline)
        return formsets, inline_instances

    def get_inline_formsets(self, request, formsets, inline_instances,
                            obj=None):
        inline_admin_formsets = []
        for inline, formset in zip(inline_instances, formsets):
            fieldsets = list(inline.get_fieldsets(request, obj))
            readonly = list(inline.get_readonly_fields(request, obj))
            prepopulated = dict(inline.get_prepopulated_fields(request, obj))
            inline_admin_formset = helpers.InlineAdminFormSet(inline, formset,
                fieldsets, prepopulated, readonly, model_admin=self)
            inline_admin_formsets.append(inline_admin_formset)
        return inline_admin_formsets
